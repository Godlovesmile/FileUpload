<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import request from '../../common/http.js'

const SIZE = 10 * 1024 * 1024
const container = reactive({ file: null })
let data = ref<any[]>([])
let fakeUploadPercentage = ref(0)

const uploadPercentage = computed(() => {
  console.log('=== test ===', data.value.length)
  if (!container.file || !data.value.length) return 0
  console.log('===', JSON.parse(JSON.stringify(data.value)))
  const loaded = data.value.map((item) => (item.size || SIZE) * item.percentage).reduce((acc, cur) => acc + cur)
  console.log(loaded)
  const process = parseInt((loaded / container.file?.size).toFixed(2))
  console.log('=== process ===', process)

  return process
})

watch(uploadPercentage, (now) => {
  console.log('=== now ===', now)
  if (now > fakeUploadPercentage.value) {
    fakeUploadPercentage.value = now
  }
})

// 保存文件
function handleFileChange(e: { target: { files: [any] } }) {
  const [file] = e.target.files

  if (!file) return

  container.file = file
}

// 进行上传
async function handleUpload() {
  if (!container.file) return

  console.log('=== file ===', container.file)
  const fileChunkList = createFileChunk(container.file)

  data.value = fileChunkList.map(({ file }, index) => ({
    chunk: file,
    index,
    hash: container.file?.name + '-' + index,
    percentage: 0,
    size: file.size,
  }))

  console.log('=== data ===', data.value)
  await uploadChunks()
}

// 生成文件切片
function createFileChunk(file: any, size = SIZE) {
  const fileChunkList = []
  let cur = 0

  while (cur < file.size) {
    fileChunkList.push({ file: file.slice(cur, cur + size) })
    cur += size
  }

  return fileChunkList
}

// 合并切片的请求
async function mergeRequest() {
  await request({
    url: 'http://localhost:3000/merge',
    headers: {
      'content-type': 'application/json',
    },
    data: JSON.stringify({
      size: SIZE,
      filename: container.file?.name,
    }),
  })
}

// 每个子切片监听上传进度事件
function createProgressHandler(item: { percentage: number }) {
  return (e: { loaded: number; total: number }) => {
    console.log(item, e.loaded)
    item.percentage = parseInt(String((e.loaded / e.total) * 100))
  }
}

// 上传切片
async function uploadChunks() {
  const requestList = data.value
    .map(({ chunk, hash, index }) => {
      const formData = new FormData()

      formData.append('chunk', chunk)
      formData.append('hash', hash)
      formData.append('filename', container.file?.name)

      return { formData, index }
    })
    .map(({ formData, index }) => {
      request({
        url: 'http://localhost:3000',
        data: formData,
        onProgress: createProgressHandler(data.value[index]),
      })
    })

  await Promise.all(requestList)
  // 合并切片请求
  // await mergeRequest()
}

async function handleMerge() {
  // 合并切片请求
  await mergeRequest()
}
</script>

<template>
  <input type="file" @change="handleFileChange" />
  <el-button type="success" @click="handleUpload">点击上传</el-button>
  <el-button type="success" @click="handleMerge">合并文件</el-button>
  <!-- <el-button type="success" @click="handleTest">test</el-button> -->
  <div>
    <div>percentage</div>
    <el-progress :percentage="uploadPercentage"></el-progress>
  </div>
  <RouterView />
</template>

<style scoped></style>

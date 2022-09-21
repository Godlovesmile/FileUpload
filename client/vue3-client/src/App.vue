<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import request from '../../common/http.js'

const SIZE = 10 * 1024 * 1024
const container = reactive<{ file: any; worker: any; hash: any }>({ file: null, worker: null, hash: '' })
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

  container.hash = await calculateHash(fileChunkList)
  data.value = fileChunkList.map(({ file }, index) => ({
    chunk: file,
    index,
    hash: container.hash + '-' + index,
    percentage: 0,
    size: file.size,
    fileHash: container.hash,
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
      fileHash: container.hash,
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
      formData.append('fileHash', container.hash)

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

// 生成文件 hash (web-worker)
async function calculateHash(fileChunkList: any) {
  return new Promise((resolve) => {
    // 添加 worker 属性
    container.worker = new Worker('/hash.js')
    container.worker.postMessage({ fileChunkList })
    container.worker.onmessage = (e: any) => {
      const { percentage, hash } = e.data
      console.log('=== message ===', percentage, e)
      if (hash) {
        resolve(hash)
      }
    }
  })
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
  <el-table :data="data">
    <el-table-column prop="hash" label="chunk hash" align="center"></el-table-column>
    <el-table-column label="size(KB)" align="center" width="120">
      <template v-slot="{ row }">
        {{ row.size }}
      </template>
    </el-table-column>
    <el-table-column label="percentage" align="center">
      <template v-slot="{ row }">
        <el-progress :percentage="row.percentage" color="#909399"></el-progress>
      </template>
    </el-table-column>
  </el-table>
  <RouterView />
</template>

<style scoped></style>

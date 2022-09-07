<script setup lang="ts">
import { reactive } from 'vue'
import request from '../../common/http.js'

const SIZE = 10 * 1024 * 1024
const container = reactive({ file: null })
let data = reactive<any[]>([])

// 保存文件
function handleFileChange(e) {
  const [file] = e.target.files

  if (!file) return

  container.file = file
}

// 进行上传
async function handleUpload() {
  if (!container.file) return

  console.log('=== file ===', container.file)
  const fileChunkList = createFileChunk(container.file)

  data = fileChunkList.map(({ file }, index) => ({
    chunk: file,
    hash: container.file?.name + '-' + index,
  }))

  console.log('=== data ===', data)
  uploadChunks()
}

// 生成文件切片
function createFileChunk(file, size = SIZE) {
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
// 上传切片
async function uploadChunks() {
  const requestList = data
    .map(({ chunk, hash }) => {
      const formData = new FormData()

      formData.append('chunk', chunk)
      formData.append('hash', hash)
      formData.append('filename', container.file?.name)

      return { formData }
    })
    .map(({ formData }) => {
      request({
        url: 'http://localhost:3000',
        data: formData,
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
  <RouterView />
</template>

<style scoped></style>

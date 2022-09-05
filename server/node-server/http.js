const http = require('http')
const path = require('path')
const multiparty = require('multiparty')
const fse = require('fs-extra')

const server = http.createServer()
// 文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, './', 'target')

const resolvePost = (req) =>
  new Promise((resolve) => {
    let chunk = ''
    req.on('data', (data = '') => {
      chunk += data
    })
    req.on('end', () => {
      console.log('=== chunk ===', chunk)
      resolve(JSON.parse(chunk || '{}'))
    })
  })

// 写入文件流
const pipeStream = (path, writeStream) => {
  new Promise((resolve) => {
    const readStream = fse.createReadStream(path)

    readStream.on('end', () => {
      fse.unlinkSync(path)
      resolve()
    })
    readStream.pipe(writeStream)
  })
}
// 合并切片
const mergeFileChunk = async (filePath, filename, size) => {
  const chunDir = path.resolve(UPLOAD_DIR, 'chunkDir' + filename)
  const chunkPaths = await fse.readdir(chunDir)

  // 根据切片下标进行排序
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])
  // 并发写入文件
  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 根据 size 在指定位置创建可写流
        fse.createWriteStream(filePath, {
          start: index * size,
        }),
      ),
    ),
  )

  // 合并后删除保存切片的目录
  fse.rmdirSync(chunDir)
}

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method == 'OPTIONS') {
    res.status = 200
    res.end()
    return
  }
  // todo
  if (req.url === '/merge') {
    const data = await resolvePost(req)
    const { filename, size } = data
    const filePath = path.resolve(UPLOAD_DIR, `${filename}`)

    await mergeFileChunk(filePath, filename, size)

    res.end(JSON.stringify({ code: 0, message: 'file merged success' }))
  }

  // 分片存储文件
  const multipart = new multiparty.Form()

  multipart.parse(req, async (err, fields, files) => {
    if (err) return

    const [chunk] = files.chunk
    const [hash] = fields.hash
    const [filename] = fields.filename

    // 创建文件夹用于临时存储 chunk
    const chunDir = path.resolve(UPLOAD_DIR, 'chunkDir' + filename)

    if (!fse.existsSync(chunDir)) {
      await fse.mkdirs(chunDir)
    }

    await fse.move(chunk.path, `${chunDir}/${hash}`)
    res.end('received file chunk')
  })
})

server.listen(3000, () => console.log('listening port 3000'))

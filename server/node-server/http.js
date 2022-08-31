const http = require('http')
const path = require('path')
const multiparty = require('multiparty')
const fse = require('fs-extra')

const server = http.createServer()
// 文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, './', 'target')

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (res.method === 'OPTIONS') {
    res.status = 200
    res.end()
    return
  }

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

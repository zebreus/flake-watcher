/// A simple http server in typescript
import { readdir, readFile, stat } from "fs/promises"
import http from "http"
import path, { join } from "path"

// const RELOAD_ENDPOINT = "/__reload"

export type ServerOptions = {
  port?: number
  host?: string
}

const wrapInHtml = (content: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `
}

const resolveFile = async (file: string | undefined) => {
  const filename = join("./", file || "index.html")
  const statResult = await stat(filename)

  if (statResult.isFile()) {
    const content = await readFile(filename, "utf-8")
    return content
  }
  if (statResult.isDirectory()) {
    const files = await readdir(filename)
    const possibleFiles = files.map(f => ({ path: path.resolve("/", filename, f), name: f }))
    const entries = possibleFiles.map(f => `<li><a href="${f.path}">${f.name}</a></li>`)
    const content = wrapInHtml(`<ul>${entries.join("")}</ul>`)
    return content
  }
  throw new Error("Path is not a file or directory")
}

export const startServer = (options: ServerOptions = {}) => {
  const { port = 3000, host = "0.0.0.0" } = options

  const requestListener = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const file = req.url
    console.log(file)

    try {
      const content = await resolveFile(file)
      res.writeHead(200)
      res.end(content)
    } catch (e) {
      console.log(e)
      res.writeHead(404)
      res.end("Not found")
    }
  }

  const server = http.createServer(requestListener)

  server.listen(port, host, () => {
    console.log(`Server is running on port http://${host}:${port}`)
  })
}

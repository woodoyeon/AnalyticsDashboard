// apps/server/src/tcp/problem2-tcp.ts
import net from "node:net"

const BLUE = "\x1b[34m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

export function startProblem2TCP(port = 4002) {
  const server = net.createServer((socket) => {
    const peer = `${socket.remoteAddress}:${socket.remotePort}`
    console.log(`${GREEN}✅ TCP P2 connection${RESET} from ${peer}`)

    socket.on("data", (buf) => {
      const s = String(buf).replace(/\r/g, "").trim() // 예) "ping" 또는 "foobar|3000"
      if (!s) return
      const [textRaw, delayStr] = s.split("|")
      const text = (textRaw ?? "").trim()
      const delay = Math.max(0, Number(delayStr ?? 0)) || 0
      const isPing = text.toLowerCase() === "ping"

      console.log(`${BLUE}⬇︎ recv${RESET} [${peer}] "${text}" (delay ${delay}ms)`)

      setTimeout(() => {
        const out = isPing ? "pong\n" : `${text}\n`
        socket.write(out)
        console.log(`${YELLOW}⬆︎ send${RESET} [${peer}] "${out.trim()}"`)
      }, delay)
    })

    socket.on("close", () => {
      console.log(`${GREEN}🔌 TCP P2 closed${RESET} ${peer}`)
    })
    socket.on("error", () => { /* no-op */ })
  })

  server.listen(port, () => {
    console.log(`✅ TCP P2 server on :${port} (send "ping" -> "pong")`)
  })

  return server
}

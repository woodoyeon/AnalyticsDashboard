// apps/server/src/ws/problem2.ts
import type { Server as HttpServer } from "http"
import { WebSocketServer, WebSocket } from "ws"

type InMsg = {
  id: number
  text: string               // "ping"이면 "pong" 반환, 아니면 echo
  delayMs?: number           // 비동기 지연(ms)
  meta?: Record<string, unknown>
}

type OutMsg = {
  type: "pong" | "echo" | "error" | "hello"
  id?: number
  text: string
  delayMs?: number
  t: number                  // 서버 전송 시각(epoch ms)
}

export function attachProblem2WS(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws/p2" })

  wss.on("connection", (ws: WebSocket, req) => {
    const peer = req.socket.remoteAddress
    console.log(`✅ WS /ws/p2 connected ${peer}`)

    // 연결 알림
    ws.send(JSON.stringify<OutMsg>({
      type: "hello",
      text: "connected /ws/p2",
      t: Date.now(),
    }))

    ws.on("message", (raw) => {
      let msg: InMsg | null = null
      try {
        msg = JSON.parse(String(raw))
      } catch {
        const out: OutMsg = { type: "error", text: "invalid JSON", t: Date.now() }
        try { ws.send(JSON.stringify(out)) } catch {}
        return
      }

      const delay = Math.max(0, Number(msg?.delayMs ?? 0))
      setTimeout(() => {
        const isPing = String(msg?.text ?? "").trim().toLowerCase() === "ping"
        const out: OutMsg = {
          type: isPing ? "pong" : "echo",
          id: msg?.id,
          text: isPing ? "pong" : String(msg?.text ?? ""),
          delayMs: delay,
          t: Date.now(),
        }
        try { ws.send(JSON.stringify(out)) } catch { /* ignore */ }
      }, delay)
    })

    ws.on("close", () => console.log(`🔌 WS /ws/p2 closed ${peer}`))
    ws.on("error", () => { /* no-op */ })

    // 필요 시 keep-alive (주석 해제해서 사용)
    // const iv = setInterval(() => {
    //   if (ws.readyState === ws.OPEN) {
    //     try { ws.ping() } catch {}
    //   } else {
    //     clearInterval(iv)
    //   }
    // }, 30000)
  })

  console.log("✅ WS attached: ws://<host>:<port>/ws/p2")
}

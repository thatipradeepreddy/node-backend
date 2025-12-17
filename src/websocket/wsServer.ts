import WebSocket from "ws"
import http from "http"
import cookie from "cookie"

import { verifyCognitoToken } from "../middleware/auth"
import { listPlayers } from "../routes/createPlayer"
import { analyzePlayer } from "../ai/playerBrain"
import { buildPlayerPrompt } from "../ai/promptBuilder"
import { GroqProvider } from "../ai/groqProvider"

const groq = new GroqProvider(process.env.GROQ_API_KEY!)

export function setupWebSocket(server: http.Server) {
	const wss = new WebSocket.Server({ server })

	wss.on("connection", async (ws, req) => {
		try {
			const cookies = cookie.parse(req.headers.cookie || "")
			const token = cookies.accessToken

			if (!token) {
				ws.close(1008, "Unauthorized")
				return
			}

			const decoded = await verifyCognitoToken(token)
			const ownerId = decoded.sub as string

			;(ws as any).ownerId = ownerId

			ws.on("message", async raw => {
				try {
					const payload = JSON.parse(raw.toString())
					const { prompt } = payload

					if (!prompt || typeof prompt !== "string") {
						ws.send(
							JSON.stringify({
								error: "Prompt must be a non-empty string"
							})
						)
						return
					}

					const players = await listPlayers(ownerId)
					const analysis = players.map(analyzePlayer)

					const aiPrompt = buildPlayerPrompt(prompt, players, analysis)

					const answer = await groq.generateInsight(aiPrompt)

					ws.send(JSON.stringify({ answer }))
				} catch (err: any) {
					console.error("WS message error:", err.message)

					ws.send(
						JSON.stringify({
							error: "AI service error. Please try again in a moment."
						})
					)
				}
			})

			ws.on("error", err => {
				console.error("WebSocket error:", err)
			})
		} catch (err) {
			ws.close(1008, "Unauthorized")
		}
	})
}

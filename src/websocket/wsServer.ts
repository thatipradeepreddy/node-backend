import WebSocket from "ws"
import http from "http"
import cookie from "cookie"

import { verifyCognitoToken } from "../middleware/auth"
import { GroqProvider } from "../ai/groqProvider"
import { buildPlayerPrompt } from "../ai/promptBuilder"
import { analyzePlayer } from "../ai/playerBrain"

import { detectIntent } from "../rag/intentRouter"
import { searchPlayerIds } from "../rag/vectorStore"
import { getPlayersByIds } from "../routes/createPlayer"
import { embed } from "../rag/embedder"

const groq = new GroqProvider(process.env.GROQ_API_KEY!)

export function setupWebSocket(server: http.Server) {
	const wss = new WebSocket.Server({ server })

	wss.on("connection", async (ws, req) => {
		try {
			// 🔐 Auth via HttpOnly cookie
			const cookies = cookie.parse(req.headers.cookie || "")
			const token = cookies.accessToken

			if (!token) {
				ws.close(1008, "Unauthorized")
				return
			}

			const decoded = await verifyCognitoToken(token)
			const ownerId = decoded.sub as string

			// ✅ MESSAGE HANDLER (PER CLIENT)
			ws.on("message", async raw => {
				try {
					const { prompt } = JSON.parse(raw.toString())
					if (!prompt || typeof prompt !== "string") return

					const intent = detectIntent(prompt)

					// 👋 GREETING
					if (intent === "GREETING") {
						ws.send(
							JSON.stringify({
								answer: "Hello 👋 How can I help you with cricket today?"
							})
						)
						return
					}

					// 📘 GENERAL CRICKET (NO DB)
					if (intent === "GENERAL") {
						const answer = await groq.generateInsight(prompt)
						ws.send(JSON.stringify({ answer }))
						return
					}

					// 🧠 DB CONTEXT REQUIRED → EMBED USER PROMPT
					const vector = await embed(prompt)

					// ⛔ HARD SAFETY
					if (!Array.isArray(vector) || vector.length !== 384) {
						ws.send(
							JSON.stringify({
								answer: "I couldn’t understand the question clearly. Please rephrase."
							})
						)
						return
					}

					const playerIds = await searchPlayerIds(vector, ownerId)

					if (!playerIds.length) {
						ws.send(
							JSON.stringify({
								answer: "No relevant players found. Try being more specific."
							})
						)
						return
					}

					const players = await getPlayersByIds(ownerId, playerIds)
					const analysis = players.map(analyzePlayer)

					const aiPrompt = buildPlayerPrompt(prompt, players, analysis)
					const answer = await groq.generateInsight(aiPrompt)

					ws.send(JSON.stringify({ answer }))
				} catch (err) {
					console.error("WS message error:", err)
					ws.send(
						JSON.stringify({
							error: "Something went wrong. Please try again."
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

import WebSocket from "ws"
import http from "http"
import cookie from "cookie"

import { verifyCognitoToken } from "../middleware/auth"
import { GroqProvider } from "../ai/groqProvider"
import { buildPlayerPrompt } from "../ai/promptBuilder"
import { analyzePlayer } from "../ai/playerBrain"

import { detectIntent } from "../rag/intentRouter"
import { embed } from "../rag/embedder"
import { searchPlayerIds } from "../rag/vectorStore"
import { getPlayersByIds, listPlayers } from "../routes/createPlayer"

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

			ws.on("message", async raw => {
				try {
					const payload = JSON.parse(raw.toString())

					const prompt: string = payload?.prompt
					const enableAIInsights: boolean = payload?.enableAIInsights === true

					if (!prompt || typeof prompt !== "string") {
						ws.send(JSON.stringify({ error: "Invalid prompt" }))
						return
					}

					if (!enableAIInsights) {
						const answer = await groq.generateInsight(prompt)
						ws.send(JSON.stringify({ answer }))
						return
					}

					const intent = detectIntent(prompt)

					if (intent === "GREETING") {
						ws.send(JSON.stringify({ answer: "Hello 👋 How can I help you with cricket today?" }))
						return
					}

					if (intent === "GENERAL_CRICKET") {
						const answer = await groq.generateInsight(prompt)
						ws.send(JSON.stringify({ answer }))
						return
					}

					const vector = await embed(prompt)

					let playerIds = await searchPlayerIds(vector, ownerId)

					if (!playerIds.length) {
						const allPlayers = await listPlayers(ownerId)

						if (!allPlayers.length) {
							ws.send(
								JSON.stringify({
									answer: "You have not added any players yet. Please create players first."
								})
							)
							return
						}

						const analysis = allPlayers.map(analyzePlayer)
						const aiPrompt = buildPlayerPrompt(prompt, allPlayers, analysis)
						const answer = await groq.generateInsight(aiPrompt)

						ws.send(JSON.stringify({ answer }))
						return
					}

					const players = await getPlayersByIds(ownerId, playerIds)

					if (!players.length) {
						ws.send(JSON.stringify({ answer: "Player data not available." }))
						return
					}

					const analysis = players.map(analyzePlayer)
					const aiPrompt = buildPlayerPrompt(prompt, players, analysis)

					const answer = await groq.generateInsight(aiPrompt)
					ws.send(JSON.stringify({ answer }))
				} catch (err) {
					console.error("WS error:", err)
					ws.send(JSON.stringify({ error: "Something went wrong. Please try again." }))
				}
			})
		} catch (err) {
			ws.close(1008, "Unauthorized")
		}
	})
}

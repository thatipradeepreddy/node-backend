import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import cors from "cors"
import http from "http"

import authRoutes from "./routes/auth"
import { playerRouter } from "./routes/createPlayer"
import { authMiddleware } from "./middleware/auth"
import { setupWebSocket } from "./websocket/wsServer"
import { playerInsightsRouter } from "./routes/playerInsightsRouter"
import { initQdrantCollection } from "./rag/initQdrant"

dotenv.config()

const app = express()

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) return callback(null, true)

			if (allowedOrigins.includes(origin)) {
				return callback(null, true)
			}

			return callback(new Error("Not allowed by CORS"))
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"]
	})
)

app.use(bodyParser.json())
app.use(cookieParser())

app.use("/auth", authRoutes)
app.use("/api", playerRouter)
app.use("/api", playerInsightsRouter)

const server = http.createServer(app)
setupWebSocket(server)

app.get("/protected-route", authMiddleware, (req, res) => {
	res.json({
		message: "You accessed a protected route!",
		user: req.user || null
	})
})

const PORT = process.env.PORT || 3000

async function start() {
	await initQdrantCollection()
	server.listen(PORT, () => {
		console.log(`HTTP + WebSocket server running on ${PORT}`)
	})
}

start()

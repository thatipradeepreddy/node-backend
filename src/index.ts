import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
dotenv.config()

import { initDb, DB_PATH } from "./db"
import authRouter from "./auth/auth.controller"
import usersRouter from "./user.routes"
import { initMailer } from "./mailer"

const app = express()
const PORT = Number(process.env.PORT || 3000)

initDb()
initMailer()

app.use(helmet())
app.use(cors({ origin: process.env.APP_BASE_URL || true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use(
	rateLimit({
		windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
		max: Number(process.env.RATE_LIMIT_MAX || 200)
	})
)

app.get("/health", (_req, res) => res.json({ ok: true, db: DB_PATH }))

app.use("/auth", authRouter)
app.use("/users", usersRouter)

app.use(express.static("public"))

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`)
})

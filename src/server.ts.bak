import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import cors from "cors"
import authRoutes from "./routes/auth"
import { authMiddleware } from "./middleware/auth"

dotenv.config()

const app = express()

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173"
const PORT = process.env.PORT || 4000

app.use(bodyParser.json())
app.use(cookieParser())

app.use(
	cors({
		origin: FRONTEND_ORIGIN,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true
	})
)

app.options("*", cors())

app.use("/auth", authRoutes)

app.get("/protected-route", authMiddleware, (req, res) => {
	res.json({
		message: "You accessed a protected route!",
		user: req.user || null
	})
})

app.listen(PORT, () => console.log(`Server listening on ${PORT}`))

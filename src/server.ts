import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import cors from "cors"
import authRoutes from "./routes/auth"
import { authMiddleware } from "./middleware/auth"
import s3Routes from "./routes/s3"

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

app.use((req, res, next) => {
	if (req.method === "OPTIONS") {
		res.header("Access-Control-Allow-Origin", FRONTEND_ORIGIN)
		res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		res.header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		res.header("Access-Control-Allow-Credentials", "true")
		return res.sendStatus(204)
	}
	return next()
})

app.use("/auth", authRoutes)
app.use("/s3", s3Routes)

app.get("/protected-route", authMiddleware, (req, res) => {
	res.json({
		message: "You accessed a protected route!",
		user: req.user || null
	})
})

app.listen(PORT, () => console.log(`Server listening on ${PORT}`))

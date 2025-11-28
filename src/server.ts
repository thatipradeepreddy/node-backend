import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import authRoutes from "./routes/auth"
import { authMiddleware } from "./middleware/auth"

dotenv.config()

const app = express()
app.use(bodyParser.json())
app.use("/auth", authRoutes)

app.get("/protected-route", authMiddleware, (req, res) => {
	res.json({ message: "You accessed a protected route!", user: req.user || null })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server listening ${PORT}`))

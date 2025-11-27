import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import authRoutes from "./routes/auth"

dotenv.config()

const app = express()
app.use(bodyParser.json())
app.use("/auth", authRoutes)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server listening ${PORT}`))

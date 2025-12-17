import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { askPlayerAI } from "../services/askPlayerAI"

export const playerInsightsRouter = Router()

playerInsightsRouter.post("/players/:id/ask", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const { id } = req.params
	const { question } = req.body

	if (!question || typeof question !== "string") {
		return res.status(400).json({ message: "Question is required" })
	}

	try {
		const answer = await askPlayerAI(ownerId, id, question)
		res.json({ answer })
	} catch (err: any) {
		res.status(500).json({ message: err.message })
	}
})

import { analyzePlayer } from "../ai/playerBrain"
import { buildPlayerPrompt } from "../ai/promptBuilder"
import { GroqProvider } from "../ai/groqProvider"
import { getPlayerById } from "../routes/createPlayer"

const groq = new GroqProvider(process.env.GROQ_API_KEY!)

export async function askPlayerAI(ownerId: string, playerId: string, question: string): Promise<string> {
	const player = await getPlayerById(playerId, ownerId)
	if (!player) {
		throw new Error("Player not found")
	}

	const analysis = analyzePlayer(player)

	const prompt = buildPlayerPrompt(question, [player], [analysis])

	const response = await groq.generateInsight(prompt)

	return response
}

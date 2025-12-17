type GroqChatResponse = {
	choices?: Array<{
		message?: {
			content?: string
		}
	}>
}

export class GroqProvider {
	private readonly MODELS = ["llama-3.1-8b-instant", "mixtral-8x7b-32768"]

	constructor(private apiKey: string) {
		if (!apiKey) {
			throw new Error("GROQ_API_KEY is missing")
		}
	}

	async generateInsight(prompt: string): Promise<string> {
		let lastError: unknown = null

		for (const model of this.MODELS) {
			try {
				const controller = new AbortController()
				const timeout = setTimeout(() => controller.abort(), 12_000)

				const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
					method: "POST",
					signal: controller.signal,
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						model,
						messages: [{ role: "user", content: prompt }],
						temperature: 0.3
					})
				})

				clearTimeout(timeout)

				if (!res.ok) {
					const errText = await res.text()
					throw new Error(`[${model}] ${errText}`)
				}

				const data = (await res.json()) as GroqChatResponse
				const content = data.choices?.[0]?.message?.content

				if (!content) {
					throw new Error(`[${model}] Empty AI response`)
				}

				return content
			} catch (err) {
				lastError = err
				console.warn(`Groq model failed → ${model}`, err)
			}
		}

		throw new Error(
			`All Groq models unavailable. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
		)
	}
}

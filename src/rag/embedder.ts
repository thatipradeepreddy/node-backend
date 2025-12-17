import { pipeline } from "@xenova/transformers"

let embedder: any

async function getEmbedder() {
	if (!embedder) {
		embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
	}
	return embedder
}

export async function embed(text: string): Promise<number[]> {
	if (!text || typeof text !== "string") {
		throw new Error("Embedding input must be a non-empty string")
	}

	const model = await getEmbedder()
	const output = await model(text, {
		pooling: "mean",
		normalize: true
	})

	const vector = Array.from(output.data)

	if (!Array.isArray(vector)) {
		throw new Error("Embedding output is not an array")
	}

	if (vector.length !== 384) {
		throw new Error(`Invalid embedding size: expected 384, got ${vector.length}`)
	}

	return vector as number[]
}

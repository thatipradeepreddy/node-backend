import axios from "axios"

const QDRANT_URL = process.env.QDRANT_URL_PROD || "http://host.docker.internal:6333"
const COLLECTION = "players"
const VECTOR_SIZE = 384

type QdrantSearchResult = {
	id: string
	score: number
	payload?: {
		playerId?: string
		ownerId?: string
	}
}

export async function searchPlayerIds(vector: number[], ownerId: string, limit = 5): Promise<string[]> {
	if (!Array.isArray(vector)) {
		console.error("Vector is not an array")
		return []
	}

	if (vector.length !== VECTOR_SIZE) {
		console.error(`Invalid vector size. Expected ${VECTOR_SIZE}, got ${vector.length}`)
		return []
	}

	if (!ownerId) {
		console.error("ownerId missing for vector search")
		return []
	}

	try {
		const res = await axios.post(
			`${QDRANT_URL}/collections/${COLLECTION}/points/search`,
			{
				vector,
				limit,
				with_payload: true,
				with_vector: false,
				filter: {
					must: [
						{
							key: "ownerId",
							match: {
								value: ownerId
							}
						}
					]
				}
			},
			{
				headers: {
					"Content-Type": "application/json"
				},
				timeout: 5000
			}
		)

		const results: QdrantSearchResult[] = res.data?.result ?? []

		if (!Array.isArray(results)) {
			console.warn("⚠️ Qdrant returned unexpected result format")
			return []
		}

		const playerIds = results
			.filter(r => r.score > 0.75)
			.map(r => r.payload?.playerId)
			.filter((id): id is string => typeof id === "string")

		return [...new Set(playerIds)]
	} catch (err: any) {
		if (err.response) {
			console.error("Qdrant search failed", {
				status: err.response.status,
				data: err.response.data
			})
		} else {
			console.error("Qdrant connection error:", err.message)
		}

		return []
	}
}

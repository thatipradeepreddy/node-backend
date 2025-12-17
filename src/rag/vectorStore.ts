import axios from "axios"

const QDRANT_URL = "http://localhost:6333"
const COLLECTION = "players"

export async function searchPlayerIds(vector: number[], ownerId: string, limit = 5): Promise<string[]> {
	if (!Array.isArray(vector) || vector.length !== 384) {
		console.error("Invalid vector passed to Qdrant:", vector)
		return []
	}

	const res = await axios.post(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
		vector,
		limit,
		with_payload: true,
		filter: {
			must: [
				{
					key: "ownerId",
					match: { value: ownerId }
				}
			]
		}
	})

	return res.data.result?.map((p: any) => p.payload.playerId) ?? []
}

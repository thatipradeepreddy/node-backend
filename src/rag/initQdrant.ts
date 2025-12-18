import axios from "axios"

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333"
const COLLECTION = "players"
const VECTOR_SIZE = 384

export async function initQdrantCollection() {
	try {
		await axios.put(`${QDRANT_URL}/collections/${COLLECTION}`, {
			vectors: {
				size: VECTOR_SIZE,
				distance: "Cosine"
			}
		})

		console.log("Qdrant collection 'players' ready")
	} catch (err: any) {
		if (err.response?.status === 409) {
			console.log("ℹ️ Qdrant collection already exists")
			return
		}
		throw err
	}
}

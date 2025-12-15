import { Router, Request, Response } from "express"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { v4 as uuidv4 } from "uuid"
import { CreatePlayerInput, Player, UpdatePlayerInput } from "../types/player.types"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { authMiddleware } from "../middleware/auth"

const TABLE_NAME = process.env.CYT_PLAYERS_TABLE || "cyt-players-table"
const REGION = process.env.DYNAMODB_REGION || "ap-south-1"
const PLAYER_IMAGES_BUCKET = process.env.CYT_PLAYER_IMAGES_BUCKET || "cyt-player-images-bucket-v1"

const dynamoClient = new DynamoDBClient({
	region: REGION
})

const docClient = DynamoDBDocumentClient.from(dynamoClient)

const s3Client = new S3Client({
	region: REGION
})

interface PlayerResponse extends Player {
	imageUrl?: string
}

function buildUpdateExpression(update: UpdatePlayerInput) {
	const ExpressionAttributeNames: Record<string, string> = {}
	const ExpressionAttributeValues: Record<string, any> = {}
	const setParts: string[] = []

	Object.entries(update).forEach(([key, value]) => {
		if (value === undefined) return

		const nameKey = `#${key}`
		const valueKey = `:${key}`
		ExpressionAttributeNames[nameKey] = key
		ExpressionAttributeValues[valueKey] = value
		setParts.push(`${nameKey} = ${valueKey}`)
	})

	ExpressionAttributeNames["#updatedAt"] = "updatedAt"
	ExpressionAttributeValues[":updatedAt"] = new Date().toISOString()
	setParts.push("#updatedAt = :updatedAt")

	return {
		UpdateExpression: "SET " + setParts.join(", "),
		ExpressionAttributeNames,
		ExpressionAttributeValues
	}
}

function buildImageKey(playerId: string, fileName: string): string {
	const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
	const now = Date.now()
	return `players/${playerId}/profile-${now}-${safeName}`
}

async function getPlayerImageUrl(player: Player): Promise<string | undefined> {
	if (!player.imageKey) return undefined

	const command = new GetObjectCommand({
		Bucket: PLAYER_IMAGES_BUCKET,
		Key: player.imageKey
	})

	return await getSignedUrl(s3Client, command, { expiresIn: 86400 })
}

function mapItemToPlayer(item: any): Player | null {
	if (!item) return null
	const id = item.id ?? item.playerId
	return { ...item, id } as Player
}

async function setPlayerImageKey(id: string, imageKey: string): Promise<Player | null> {
	const existing = await getPlayerById(id)
	if (!existing) return null

	const res = await docClient.send(
		new UpdateCommand({
			TableName: TABLE_NAME,
			Key: { id: existing.id, village: existing.village },
			UpdateExpression: "SET #imageKey = :imageKey, #updatedAt = :updatedAt",
			ExpressionAttributeNames: {
				"#imageKey": "imageKey",
				"#updatedAt": "updatedAt"
			},
			ExpressionAttributeValues: {
				":imageKey": imageKey,
				":updatedAt": new Date().toISOString()
			},
			ReturnValues: "ALL_NEW"
		})
	)

	return res.Attributes as Player
}

async function createPlayer(data: CreatePlayerInput): Promise<Player> {
	const now = new Date().toISOString()
	const playerId = uuidv4()

	const player: Player = {
		id: playerId,
		name: data.name,
		age: data.age,
		village: data.village,
		role: data.role,
		battingStyle: data.battingStyle ?? "NONE",
		bowlingStyle: data.bowlingStyle ?? "NONE",
		matches: data.matches ?? 0,
		runs: data.runs ?? 0,
		wickets: data.wickets ?? 0,
		strikeRate: data.strikeRate ?? 0,
		economyRate: data.economyRate ?? 0,
		average: data.average ?? 0,
		teams: data.teams ?? [],
		isActive: data.isActive ?? true,
		imageKey: undefined,
		createdAt: now,
		updatedAt: now
	}

	await docClient.send(
		new PutCommand({
			TableName: TABLE_NAME,
			Item: player
		})
	)

	return player
}

async function getPlayerById(id: string): Promise<Player | null> {
	const res = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAME,
			FilterExpression: "#id = :id",
			ExpressionAttributeNames: { "#id": "id" },
			ExpressionAttributeValues: { ":id": id }
		})
	)

	if (!res.Items || res.Items.length === 0) return null

	return res.Items[0] as Player
}

async function updatePlayer(id: string, data: UpdatePlayerInput): Promise<Player | null> {
	const existing = await getPlayerById(id)
	if (!existing) return null

	const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildUpdateExpression(data)

	const res = await docClient.send(
		new UpdateCommand({
			TableName: TABLE_NAME,
			Key: { id: existing.id, village: existing.village },
			UpdateExpression,
			ExpressionAttributeNames,
			ExpressionAttributeValues,
			ReturnValues: "ALL_NEW"
		})
	)

	return res.Attributes as Player
}

async function deletePlayer(id: string): Promise<void> {
	const existing = await getPlayerById(id)
	if (!existing) return

	await docClient.send(
		new DeleteCommand({
			TableName: TABLE_NAME,
			Key: { id: existing.id, village: existing.village }
		})
	)
}

async function listPlayers(): Promise<Player[]> {
	const res = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAME
		})
	)

	const items = (res.Items as any[]) ?? []
	return items.map(i => mapItemToPlayer(i)).filter(Boolean) as Player[]
}

export const playerRouter = Router()

playerRouter.post("/players", authMiddleware, async (req: Request<unknown, unknown, CreatePlayerInput>, res: Response) => {
	try {
		const body = req.body

		if (!body.name || !body.village || !body.role) {
			return res.status(400).json({
				message: "name, village and role are required"
			})
		}

		const player = await createPlayer(body)
		const imageUrl = await getPlayerImageUrl(player)

		const response: PlayerResponse = { ...player, imageUrl }

		return res.status(201).json(response)
	} catch (error) {
		console.error("Error creating player:", error)
		return res.status(500).json({ message: "Internal server error" })
	}
})

playerRouter.get("/players", authMiddleware, async (_req: Request, res: Response) => {
	try {
		const players = await listPlayers()

		const playersWithUrls: PlayerResponse[] = await Promise.all(
			players.map(async p => ({
				...p,
				imageUrl: await getPlayerImageUrl(p)
			}))
		)

		return res.json(playersWithUrls)
	} catch (error) {
		console.error("Error listing players:", error)
		return res.status(500).json({ message: "Internal server error" })
	}
})

playerRouter.get("/players/:id", authMiddleware, async (req: Request, res: Response) => {
	try {
		const id = req.params.id
		const player = await getPlayerById(id)

		if (!player) {
			return res.status(404).json({ message: "Player not found" })
		}

		const imageUrl = await getPlayerImageUrl(player)
		const response: PlayerResponse = { ...player, imageUrl }

		return res.json(response)
	} catch (error) {
		console.error("Error getting player:", error)
		return res.status(500).json({ message: "Internal server error" })
	}
})

playerRouter.put(
	"/players/:id",
	authMiddleware,
	async (req: Request<{ id: string }, unknown, UpdatePlayerInput>, res: Response) => {
		try {
			const id = req.params.id
			const updates = req.body

			const updated = await updatePlayer(id, updates)

			if (!updated) {
				return res.status(404).json({ message: "Player not found" })
			}

			const imageUrl = await getPlayerImageUrl(updated)
			const response: PlayerResponse = { ...updated, imageUrl }

			return res.json(response)
		} catch (error) {
			console.error("Error updating player:", error)
			return res.status(500).json({ message: "Internal server error" })
		}
	}
)

playerRouter.delete("/players/:id", authMiddleware, async (req: Request, res: Response) => {
	try {
		const id = req.params.id
		await deletePlayer(id)
		return res.status(204).send()
	} catch (error) {
		console.error("Error deleting player:", error)
		return res.status(500).json({ message: "Internal server error" })
	}
})

playerRouter.post(
	"/players/:id/image-url",
	authMiddleware,
	async (req: Request<{ id: string }, unknown, { fileName: string; contentType?: string }>, res: Response) => {
		try {
			const playerId = req.params.id
			const { fileName, contentType } = req.body

			console.log("Received request for upload URL:", req.body, { fileName, contentType })

			if (!fileName) {
				return res.status(400).json({ message: "fileName is required" })
			}

			const player = await getPlayerById(playerId)
			if (!player) {
				return res.status(404).json({ message: "Player not found" })
			}

			const key = buildImageKey(playerId, fileName)

			const command = new PutObjectCommand({
				Bucket: PLAYER_IMAGES_BUCKET,
				Key: key,
				ContentType: contentType
			})

			const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 })

			await setPlayerImageKey(playerId, key)

			return res.status(200).json({
				uploadUrl,
				key
			})
		} catch (error: any) {
			console.error("Error creating upload URL:", error)
			return res.status(500).json({ message: error?.message || "Internal server error" })
		}
	}
)

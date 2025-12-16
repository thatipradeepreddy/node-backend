import { Router, Request, Response } from "express"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { v4 as uuidv4 } from "uuid"
import { CreatePlayerInput, Player, UpdatePlayerInput } from "../types/player.types"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { authMiddleware } from "../middleware/auth"
import { QueryCommand } from "@aws-sdk/lib-dynamodb"

const TABLE_NAME = process.env.CYT_PLAYERS_TABLE || "cyt-player-table-v3"
const REGION = process.env.DYNAMODB_REGION || "ap-south-1"
const PLAYER_IMAGES_BUCKET = process.env.CYT_PLAYER_IMAGES_BUCKET || "cyt-player-images-bucket-v1"

const dynamoClient = new DynamoDBClient({ region: REGION })
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const s3Client = new S3Client({ region: REGION })

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
	return `players/${playerId}/profile-${Date.now()}-${safeName}`
}

async function getPlayerImageUrl(player: Player): Promise<string | undefined> {
	if (!player.imageKey) return undefined

	return getSignedUrl(
		s3Client,
		new GetObjectCommand({
			Bucket: PLAYER_IMAGES_BUCKET,
			Key: player.imageKey
		}),
		{ expiresIn: 86400 }
	)
}

async function setPlayerImageKey(id: string, imageKey: string, ownerId: string): Promise<Player | null> {
	const existing = await getPlayerById(id, ownerId)
	if (!existing) return null

	const res = await docClient.send(
		new UpdateCommand({
			TableName: TABLE_NAME,
			Key: {
				ownerId: ownerId,
				id: id
			},
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

async function createPlayer(ownerId: string, data: CreatePlayerInput): Promise<Player> {
	const now = new Date().toISOString()
	const playerId = uuidv4()

	const player: Player = {
		id: playerId,
		ownerId,
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

	await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: player }))
	return player
}

async function getPlayerById(id: string, ownerId: string): Promise<Player | null> {
	const res = await docClient.send(
		new QueryCommand({
			TableName: TABLE_NAME,
			KeyConditionExpression: "#ownerId = :ownerId AND #id = :id",
			ExpressionAttributeNames: {
				"#ownerId": "ownerId",
				"#id": "id"
			},
			ExpressionAttributeValues: {
				":ownerId": ownerId,
				":id": id
			}
		})
	)

	if (!res.Items || res.Items.length === 0) return null
	return res.Items[0] as Player
}

async function updatePlayer(id: string, ownerId: string, data: UpdatePlayerInput): Promise<Player | null> {
	const existing = await getPlayerById(id, ownerId)
	if (!existing) return null

	const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildUpdateExpression(data)

	const res = await docClient.send(
		new UpdateCommand({
			TableName: TABLE_NAME,
			Key: { ownerId, id },
			UpdateExpression,
			ExpressionAttributeNames,
			ExpressionAttributeValues,
			ReturnValues: "ALL_NEW"
		})
	)

	return res.Attributes as Player
}

async function deletePlayer(id: string, ownerId: string): Promise<void> {
	const existing = await getPlayerById(id, ownerId)
	if (!existing) return

	await docClient.send(
		new DeleteCommand({
			TableName: TABLE_NAME,
			Key: { ownerId, id }
		})
	)
}

async function listPlayers(ownerId: string): Promise<Player[]> {
	const res = await docClient.send(
		new QueryCommand({
			TableName: TABLE_NAME,
			KeyConditionExpression: "#ownerId = :ownerId",
			ExpressionAttributeNames: {
				"#ownerId": "ownerId"
			},
			ExpressionAttributeValues: {
				":ownerId": ownerId
			}
		})
	)
	return (res.Items as Player[]) ?? []
}

export const playerRouter = Router()

playerRouter.post("/players", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const player = await createPlayer(ownerId, req.body)
	res.status(201).json({ ...player, imageUrl: await getPlayerImageUrl(player) })
})

playerRouter.get("/players", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const players = await listPlayers(ownerId)
	res.json(await Promise.all(players.map(async p => ({ ...p, imageUrl: await getPlayerImageUrl(p) }))))
})

playerRouter.get("/players/:id", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const player = await getPlayerById(req.params.id, ownerId)
	if (!player) return res.status(404).json({ message: "Player not found" })
	res.json({ ...player, imageUrl: await getPlayerImageUrl(player) })
})

playerRouter.put("/players/:id", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const updated = await updatePlayer(req.params.id, ownerId, req.body)
	if (!updated) return res.status(404).json({ message: "Player not found" })
	res.json({ ...updated, imageUrl: await getPlayerImageUrl(updated) })
})

playerRouter.delete("/players/:id", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const existing = await getPlayerById(req.params.id, ownerId)

	if (!existing) {
		return res.status(404).json({ message: "Player not found" })
	}
	await deletePlayer(req.params.id, ownerId)
	res.status(204).send()
})

playerRouter.post("/players/:id/image-url", authMiddleware, async (req, res) => {
	const ownerId = (req.user as any).sub
	const player = await getPlayerById(req.params.id, ownerId)
	if (!player) return res.status(404).json({ message: "Player not found" })

	const key = buildImageKey(req.params.id, req.body.fileName)
	const uploadUrl = await getSignedUrl(
		s3Client,
		new PutObjectCommand({
			Bucket: PLAYER_IMAGES_BUCKET,
			Key: key,
			ContentType: req.body.contentType
		}),
		{ expiresIn: 86400 }
	)

	await setPlayerImageKey(req.params.id, key, ownerId)
	res.json({ uploadUrl, key })
})

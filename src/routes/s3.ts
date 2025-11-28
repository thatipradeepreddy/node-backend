import { Router, Request, Response } from "express"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { authMiddleware } from "../middleware/auth"

const router = Router()

const BUCKET = process.env.USER_PROFILE_IMAGE_S3_BUCKET || ""
const REGION = process.env.AWS_REGION || "ap-south-1"
const EXPIRES = Number(process.env.S3_SIGNED_URL_EXPIRES_SECONDS || 300)
const MAX_BYTES = Number(process.env.MAX_PROFILE_IMAGE_BYTES || 1048576)

const s3 = new S3Client({ region: REGION })

router.post("/presign", authMiddleware, async (req: Request, res: Response) => {
	try {
		const { filename, contentType, contentLength } = req.body as {
			filename?: string
			contentType?: string
			contentLength?: number
		}

		if (!filename || !contentType) return res.status(400).json({ error: "filename and contentType required" })
		if (contentLength && contentLength > MAX_BYTES) return res.status(400).json({ error: "File too large" })

		const userSub = (req as any).user?.sub || "anonymous"
		const key = `user-profiles/${userSub}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`

		const cmd = new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			ContentType: contentType,
			ServerSideEncryption: "AES256"
		})

		const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: EXPIRES })

		return res.json({
			uploadUrl: presignedUrl,
			key,
			expiresIn: EXPIRES
		})
	} catch (err: any) {
		console.error("Presign error:", err)
		return res.status(500).json({ error: err.message || "Presign failed" })
	}
})

router.post("/presign-download", authMiddleware, async (req: Request, res: Response) => {
	try {
		const { key } = req.body as { key?: string }
		if (!key) return res.status(400).json({ error: "key required" })

		const userSub = (req as any).user?.sub
		if (!key.startsWith("user-profiles/")) return res.status(400).json({ error: "invalid key" })

		if (userSub && !key.includes(`user-profiles/${userSub}/`)) {
			return res.status(403).json({ error: "not authorized to access this file" })
		}

		const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
		const signedGet = await getSignedUrl(s3, getCmd, { expiresIn: 60 })

		return res.json({ url: signedGet, expiresIn: 60 })
	} catch (err: any) {
		console.error("Presign-download error:", err)
		return res.status(500).json({ error: err.message || "Presign-get failed" })
	}
})

export default router

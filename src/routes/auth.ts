import { Router, Request, Response } from "express"
import {
	SignUpCommand,
	ConfirmSignUpCommand,
	ResendConfirmationCodeCommand,
	InitiateAuthCommand,
	GetUserCommand
} from "@aws-sdk/client-cognito-identity-provider"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import dotenv from "dotenv"
import { cognitoClient } from "../utils/awsClient"
import { generateSecretHash } from "../utils/secretHash"
import { optionalAuth } from "../middleware/auth"
import { RegisterRequest, ConfirmRequest, ResendRequest, LoginRequest, CognitoAuthResult } from "../types/auth"

const router = Router()
dotenv.config()

const CLIENT_ID = process.env.COGNITO_CLIENT_ID as string
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET as string
const BUCKET = process.env.USER_PROFILE_IMAGE_S3_BUCKET!
const REGION = process.env.AWS_REGION || "ap-south-1"
const s3 = new S3Client({ region: REGION })

router.post("/register", async (req: Request<{}, any, RegisterRequest>, res: Response) => {
	const { name, email, password, phoneNumber, birthdate, gender, picture } = req.body
	if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" })

	if (picture) {
		const allowedPrefix = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`
		if (!picture.startsWith(allowedPrefix)) {
			return res.status(400).json({ error: "Invalid profile image URL" })
		}
	}

	try {
		const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

		const input: any = {
			ClientId: CLIENT_ID,
			Username: email,
			Password: password,
			SecretHash: secretHash,
			UserAttributes: [
				{ Name: "name", Value: name },
				{ Name: "email", Value: email },
				{ Name: "birthdate", Value: birthdate || "" },
				{ Name: "gender", Value: gender || "" },
				{ Name: "picture", Value: picture || "" }
			]
		}

		if (phoneNumber) {
			input.UserAttributes.push({ Name: "phone_number", Value: phoneNumber })
		}

		await cognitoClient.send(new SignUpCommand(input))

		return res.json({ message: "Signup initiated. Check email or SMS for verification code." })
	} catch (err: any) {
		return res.status(400).json({ error: err.message || "SignUp failed" })
	}
})

router.post("/confirm", async (req: Request<{}, any, ConfirmRequest>, res: Response) => {
	const { email, code } = req.body
	if (!email || !code) return res.status(400).json({ error: "Missing fields" })

	try {
		const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

		await cognitoClient.send(
			new ConfirmSignUpCommand({
				ClientId: CLIENT_ID,
				Username: email,
				ConfirmationCode: code,
				SecretHash: secretHash,
				ForceAliasCreation: false
			})
		)

		return res.json({ message: "Confirmed. You can now login." })
	} catch (err: any) {
		return res.status(400).json({ error: err.message || "Confirmation failed" })
	}
})

router.post("/resend", async (req: Request<{}, any, ResendRequest>, res: Response) => {
	const { email } = req.body
	if (!email) return res.status(400).json({ error: "Missing email" })

	try {
		const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

		await cognitoClient.send(
			new ResendConfirmationCodeCommand({
				ClientId: CLIENT_ID,
				Username: email,
				SecretHash: secretHash
			})
		)

		return res.json({ message: "Confirmation code resent." })
	} catch (err: any) {
		return res.status(400).json({ error: err.message || "Resend failed" })
	}
})

router.post(
	"/login",
	async (
		req: Request<{}, CognitoAuthResult | { error: string }, LoginRequest>,
		res: Response<CognitoAuthResult | { error: string }>
	) => {
		const { email, password } = req.body
		if (!email || !password) return res.status(400).json({ error: "Missing fields" })

		try {
			const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

			const authResp = await cognitoClient.send(
				new InitiateAuthCommand({
					AuthFlow: "USER_PASSWORD_AUTH",
					ClientId: CLIENT_ID,
					AuthParameters: {
						USERNAME: email,
						PASSWORD: password,
						SECRET_HASH: secretHash
					}
				})
			)

			const tokens = authResp.AuthenticationResult
			if (!tokens?.AccessToken) {
				return res.status(400).json({ error: "Unable to login" })
			}

			const userData = await cognitoClient.send(new GetUserCommand({ AccessToken: tokens.AccessToken }))

			const attrs: Record<string, string> = {}
			userData.UserAttributes?.forEach(a => {
				if (a.Name) attrs[a.Name] = a.Value ?? ""
			})

			let pictureUrl = ""
			if (attrs.picture) {
				try {
					const getCmd = new GetObjectCommand({
						Bucket: process.env.USER_PROFILE_IMAGE_S3_BUCKET!,
						Key: attrs.picture
					})
					pictureUrl = await getSignedUrl(s3, getCmd, { expiresIn: 60 })
				} catch (err) {
					console.error("Failed to generate picture URL:", err)
				}
			}

			return res.json({
				AccessToken: tokens.AccessToken,
				IdToken: tokens.IdToken,
				RefreshToken: tokens.RefreshToken,
				ExpiresIn: tokens.ExpiresIn,
				TokenType: tokens.TokenType,
				name: attrs.name || "",
				email: attrs.email || "",
				picture: pictureUrl || "",
				phone_number: attrs.phone_number || "",
				birthdate: attrs.birthdate || "",
				gender: attrs.gender || ""
			})
		} catch (err: any) {
			return res.status(400).json({ error: err.message || "Login failed" })
		}
	}
)

router.get("/protected-route", optionalAuth, (req: any, res: any) => {
	return res.json({ message: "You accessed a protected route", user: req.user || null })
})

export default router

import { Router, Request, Response } from "express"
import {
	SignUpCommand,
	ConfirmSignUpCommand,
	ResendConfirmationCodeCommand,
	InitiateAuthCommand,
	GetUserCommand,
	ForgotPasswordCommand,
	ConfirmForgotPasswordCommand,
	CognitoIdentityProviderClient
} from "@aws-sdk/client-cognito-identity-provider"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
import { generateSecretHash } from "../utils/secretHash"
import { authMiddleware, optionalAuth } from "../middleware/auth"
import {
	RegisterRequest,
	ConfirmRequest,
	ResendRequest,
	LoginRequest,
	CognitoAuthResult,
	ForgotPasswordRequest,
	ConfirmForgotPasswordRequest
} from "../types/auth"
import { refreshAuthTokens } from "../utils/refreshToken"

const router = Router()
dotenv.config()

const CLIENT_ID = process.env.COGNITO_CLIENT_ID as string
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET as string
const BUCKET = process.env.USER_PROFILE_IMAGE_S3_BUCKET!
const REGION = process.env.AWS_REGION || "ap-south-1"

const s3 = new S3Client({
	region: REGION,
	requestChecksumCalculation: "WHEN_REQUIRED",
	responseChecksumValidation: "WHEN_REQUIRED"
})

export const cognitoClient = new CognitoIdentityProviderClient({ region: REGION })

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(0, 200)

function buildUserImageKey(email: string, fileName: string): string {
	const safeName = sanitizeFilename(fileName)
	const now = Date.now()
	const emailSafe = email.replace(/[^a-zA-Z0-9]/g, "_")
	return `users/${emailSafe}/profile-${now}-${safeName}`
}

router.post(
	"/register/image-url",
	async (req: Request<{}, unknown, { email: string; fileName: string; contentType?: string }>, res: Response) => {
		try {
			const { email, fileName, contentType } = req.body

			if (!BUCKET) {
				return res.status(500).json({ message: "S3 bucket not configured" })
			}

			if (!email || !fileName) {
				return res.status(400).json({ message: "email and fileName are required" })
			}

			const key = buildUserImageKey(email, fileName)

			const command = new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				ContentType: contentType
			})

			const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 86400 })

			return res.status(200).json({
				uploadUrl,
				key
			})
		} catch (error: any) {
			console.error("Error creating register image upload URL:", error)
			return res.status(500).json({ message: error?.message || "Internal server error" })
		}
	}
)

router.post("/register", async (req: Request<{}, any, RegisterRequest>, res: Response) => {
	const { name, email, password, phoneNumber, birthdate, gender, picture } = req.body

	if (!name || !email || !password) {
		return res.status(400).json({ error: "Missing fields" })
	}

	if (!picture) {
		return res.status(400).json({ error: "Profile picture is required" })
	}

	if (picture.includes(" ")) {
		return res.status(400).json({ error: "Invalid picture key" })
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
				{ Name: "picture", Value: picture }
			]
		}

		if (phoneNumber) {
			input.UserAttributes.push({ Name: "phone_number", Value: phoneNumber })
		}

		await cognitoClient.send(new SignUpCommand(input))

		return res.json({ message: "Signup initiated. Check email or SMS for verification code." })
	} catch (err: any) {
		console.error("register error:", err)
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
			if (attrs.picture && BUCKET) {
				try {
					const key = attrs.picture.trim()
					const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
					pictureUrl = await getSignedUrl(s3, getCmd, { expiresIn: 300 })
				} catch (err) {
					console.error("Failed to generate picture URL:", err)
					pictureUrl = ""
				}
			}

			const decoded: any = jwt.decode(tokens.AccessToken)
			const cognitoUsername = decoded?.sub

			res.cookie("accessToken", tokens.AccessToken, {
				httpOnly: true,
				secure: false,
				sameSite: "lax",
				maxAge: (tokens.ExpiresIn ?? 3600) * 1000
			})
				.cookie("idToken", tokens.IdToken, {
					httpOnly: true,
					secure: false,
					sameSite: "lax"
				})
				.cookie("refreshToken", tokens.RefreshToken, {
					httpOnly: true,
					secure: false,
					sameSite: "lax"
				})
				.status(200)
				.json({
					username: cognitoUsername,
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

router.post("/refresh", async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken
		const idToken = req.cookies.idToken

		if (!refreshToken || !idToken) {
			return res.status(401).json({ error: "No refresh session" })
		}

		const decoded: any = jwt.decode(idToken)
		const username = decoded?.sub

		if (!username) {
			return res.status(401).json({ error: "Invalid session" })
		}

		const tokens = await refreshAuthTokens(refreshToken, CLIENT_ID, CLIENT_SECRET, username)

		res.cookie("accessToken", tokens.AccessToken, {
			httpOnly: true,
			secure: false,
			sameSite: "lax",
			maxAge: (tokens.ExpiresIn ?? 3600) * 1000
		})
			.cookie("idToken", tokens.IdToken, {
				httpOnly: true,
				secure: false,
				sameSite: "lax"
			})
			.status(200)
			.json({ success: true })
	} catch (err) {
		console.error("Refresh token error:", err)
		return res.status(401).json({ error: "Invalid or expired refresh token" })
	}
})

router.post("/forgot-password", async (req: Request<{}, any, ForgotPasswordRequest>, res: Response) => {
	const { email } = req.body

	if (!email) {
		return res.status(400).json({ error: "Email is required" })
	}

	try {
		const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

		await cognitoClient.send(
			new ForgotPasswordCommand({
				ClientId: CLIENT_ID,
				Username: email,
				SecretHash: secretHash
			})
		)

		return res.json({
			message: "Password reset code sent to registered email/phone"
		})
	} catch (err: any) {
		console.error("Forgot password error:", err)
		return res.status(400).json({
			error: err.message || "Failed to initiate forgot password"
		})
	}
})

router.post("/confirm-forgot-password", async (req: Request<{}, any, ConfirmForgotPasswordRequest>, res: Response) => {
	const { email, code, newPassword } = req.body

	if (!email || !code || !newPassword) {
		return res.status(400).json({
			error: "email, code and newPassword are required"
		})
	}

	try {
		const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

		await cognitoClient.send(
			new ConfirmForgotPasswordCommand({
				ClientId: CLIENT_ID,
				Username: email,
				ConfirmationCode: code,
				Password: newPassword,
				SecretHash: secretHash
			})
		)

		return res.json({
			message: "Password reset successful. You can now login."
		})
	} catch (err: any) {
		console.error("Confirm forgot password error:", err)
		return res.status(400).json({
			error: err.message || "Failed to reset password"
		})
	}
})

router.get("/me", authMiddleware, (req, res) => {
	res.status(200).json({
		user: {
			id: (req.user as any).sub,
			email: (req.user as any).email,
			name: (req.user as any).name
		}
	})
})

router.post("/logout", (req, res) => {
	res.clearCookie("accessToken", {
		httpOnly: true,
		sameSite: "lax",
		secure: false
	})
		.clearCookie("idToken", {
			httpOnly: true,
			sameSite: "lax",
			secure: false
		})
		.clearCookie("refreshToken", {
			httpOnly: true,
			sameSite: "lax",
			secure: false
		})
		.status(200)
		.json({ message: "Logged out" })
})

router.get("/protected-route", optionalAuth, (req: any, res: any) => {
	return res.json({ message: "You accessed a protected route", user: req.user || null })
})

export default router

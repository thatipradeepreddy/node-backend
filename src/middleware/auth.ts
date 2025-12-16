import jwt from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import { Request, Response, NextFunction } from "express"

const region = process.env.AWS_REGION || "ap-south-1"
const userPoolId = process.env.COGNITO_USER_POOL_ID || "ap-south-1_CMmijuUQL"

const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`

const client = jwksClient({
	jwksUri,
	cache: true,
	cacheMaxEntries: 5,
	cacheMaxAge: 10 * 60 * 1000,
	rateLimit: true,
	jwksRequestsPerMinute: 10
})

const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
	client.getSigningKey(header.kid!, (err, key) => {
		if (err) return callback(err as any)
		const pub = key?.getPublicKey()
		callback(null, pub as jwt.Secret)
	})
}

export interface CognitoJwtPayload extends jwt.JwtPayload {
	sub?: string
	email?: string
	name?: string
	picture?: string
	phone_number?: string
}

declare module "express-serve-static-core" {
	interface Request {
		user?: CognitoJwtPayload | jwt.Jwt | undefined
	}
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	if (req.method === "OPTIONS") return next()

	const token =
		req.cookies?.accessToken || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null)

	if (!token) {
		return res.status(401).json({ error: "Unauthorized" })
	}

	jwt.verify(
		token,
		getKey as any,
		{
			algorithms: ["RS256"],
			issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
			audience: undefined
		},
		(err, decoded: any) => {
			if (err) {
				return res.status(401).json({ error: "Invalid token", detail: err.message })
			}

			if (decoded.token_use !== "access") {
				return res.status(401).json({ error: "Invalid token type" })
			}

			req.user = decoded
			next()
		}
	)
}

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
	if (req.method === "OPTIONS") return next()

	const token =
		req.cookies?.accessToken || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null)

	if (!token) return next()

	jwt.verify(
		token,
		getKey as any,
		{
			algorithms: ["RS256"],
			issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
		},
		(err, decoded: any) => {
			if (err) return res.status(401).json({ error: "Invalid token" })

			if (decoded.token_use !== "access") {
				return res.status(401).json({ error: "Invalid token type" })
			}

			req.user = decoded
			next()
		}
	)
}

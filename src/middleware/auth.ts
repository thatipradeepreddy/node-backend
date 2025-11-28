import jwt from "jsonwebtoken"
import jwksClient from "jwks-rsa"
import { Request, Response, NextFunction } from "express"

const region = process.env.AWS_REGION || "ap-south-1"
const userPoolId = process.env.COGNITO_USER_POOL_ID || ""
const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`

const client = jwksClient({ jwksUri })

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
	client.getSigningKey(header.kid!, function (err, key) {
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

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
	const auth = req.headers.authorization
	if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Authorization header" })
	const token = auth.slice("Bearer ".length)

	jwt.verify(token, getKey as any, { algorithms: ["RS256"] }, (err, decoded) => {
		if (err) return res.status(401).json({ error: "Invalid token", detail: err.message })
		req.user = decoded as CognitoJwtPayload
		next()
	})
}

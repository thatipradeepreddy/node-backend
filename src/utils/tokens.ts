import * as jwt from "jsonwebtoken"
import * as crypto from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me"
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1h"

export function createJwt(payload: object): string {
	return jwt.sign(payload as string | object | Buffer, JWT_SECRET as jwt.Secret, {
		expiresIn: JWT_EXPIRES as jwt.SignOptions["expiresIn"]
	})
}

export function verifyJwt(token: string): unknown | null {
	try {
		return jwt.verify(token, JWT_SECRET as jwt.Secret)
	} catch (err) {
		return null
	}
}

export function randomToken(size = 32): string {
	return crypto.randomBytes(size).toString("hex")
}

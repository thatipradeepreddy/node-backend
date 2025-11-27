import crypto from "crypto"

export function generateSecretHash(username: string, clientId: string, clientSecret: string) {
	return crypto
		.createHmac("SHA256", clientSecret)
		.update(username + clientId)
		.digest("base64")
}

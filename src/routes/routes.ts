import { Router } from "express"
import {
	SignUpCommand,
	ConfirmSignUpCommand,
	ResendConfirmationCodeCommand,
	InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient } from "../utils/awsClient"
import { generateSecretHash } from "../utils/secretHash"

const router = Router()

const CLIENT_ID = "7nsekrlripif3gfuo3f5i6k9ll"
const CLIENT_SECRET = "f1tomrlij6e4tqpre1hnoceb4oifb6cs00vhd6hlhvkghgacuuq"

router.post("/register", async (req, res) => {
	const { name, email, password, phoneNumber, birthdate, gender, picture } = req.body
	if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" })

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

		if (phoneNumber) input.UserAttributes.push({ Name: "phone_number", Value: phoneNumber })

		await cognitoClient.send(new SignUpCommand(input))

		return res.json({ message: "Signup initiated. Check email or SMS for verification code." })
	} catch (err: any) {
		return res.status(400).json({ error: err.message || "SignUp failed" })
	}
})

router.post("/confirm", async (req, res) => {
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

router.post("/resend", async (req, res) => {
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

router.post("/login", async (req, res) => {
	const { email, password } = req.body
	if (!email || !password) return res.status(400).json({ error: "Missing fields" })

	try {
		const secretHash = generateSecretHash(email, CLIENT_ID, CLIENT_SECRET)

		const resp = await cognitoClient.send(
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

		return res.json(resp.AuthenticationResult || {})
	} catch (err: any) {
		return res.status(400).json({ error: err.message || "Login failed" })
	}
})

export default router

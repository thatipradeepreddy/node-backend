import { InitiateAuthCommand, InitiateAuthCommandInput } from "@aws-sdk/client-cognito-identity-provider"
import { generateSecretHash } from "./secretHash"
import { cognitoClient } from "../routes/auth"

export async function refreshAuthTokens(refreshToken: string, clientId: string, clientSecret: string, username: string) {
	const params: InitiateAuthCommandInput = {
		AuthFlow: "REFRESH_TOKEN_AUTH",
		ClientId: clientId,
		AuthParameters: {
			REFRESH_TOKEN: refreshToken,
			SECRET_HASH: generateSecretHash(username, clientId, clientSecret)
		}
	}

	const command = new InitiateAuthCommand(params)

	const response = await cognitoClient.send(command)

	if (!response.AuthenticationResult) {
		throw new Error("Failed to refresh tokens: no AuthenticationResult returned")
	}

	return response.AuthenticationResult
}

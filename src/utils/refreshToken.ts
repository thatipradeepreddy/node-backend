import { InitiateAuthCommand, InitiateAuthCommandInput } from "@aws-sdk/client-cognito-identity-provider"
import { generateSecretHash } from "./secretHash"
import { cognitoClient } from "../routes/auth"

export async function refreshAuthTokens(refreshToken: string, clientId: string, clientSecret: string, cognitoUsername: string) {
	const params: InitiateAuthCommandInput = {
		AuthFlow: "REFRESH_TOKEN_AUTH",
		ClientId: clientId,
		AuthParameters: {
			REFRESH_TOKEN: refreshToken,
			USERNAME: cognitoUsername,
			SECRET_HASH: generateSecretHash(cognitoUsername, clientId, clientSecret)
		}
	}

	const response = await cognitoClient.send(new InitiateAuthCommand(params))

	if (!response.AuthenticationResult) {
		throw new Error("No AuthenticationResult returned")
	}

	return response.AuthenticationResult
}

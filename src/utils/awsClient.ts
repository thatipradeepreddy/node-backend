import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider"
const REGION = process.env.AWS_REGION || "ap-south-1"
export const cognitoClient = new CognitoIdentityProviderClient({ region: REGION })

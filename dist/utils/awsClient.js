"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cognitoClient = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const REGION = process.env.AWS_REGION || "ap-south-1";
exports.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: REGION });

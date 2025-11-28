"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const dotenv_1 = __importDefault(require("dotenv"));
const awsClient_1 = require("../utils/awsClient");
const secretHash_1 = require("../utils/secretHash");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
dotenv_1.default.config();
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
router.post("/register", async (req, res) => {
    const { name, email, password, phoneNumber, birthdate, gender, picture } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: "Missing fields" });
    try {
        const secretHash = (0, secretHash_1.generateSecretHash)(email, CLIENT_ID, CLIENT_SECRET);
        const input = {
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
        };
        if (phoneNumber) {
            input.UserAttributes.push({ Name: "phone_number", Value: phoneNumber });
        }
        await awsClient_1.cognitoClient.send(new client_cognito_identity_provider_1.SignUpCommand(input));
        return res.json({ message: "Signup initiated. Check email or SMS for verification code." });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "SignUp failed" });
    }
});
router.post("/confirm", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code)
        return res.status(400).json({ error: "Missing fields" });
    try {
        const secretHash = (0, secretHash_1.generateSecretHash)(email, CLIENT_ID, CLIENT_SECRET);
        await awsClient_1.cognitoClient.send(new client_cognito_identity_provider_1.ConfirmSignUpCommand({
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: code,
            SecretHash: secretHash,
            ForceAliasCreation: false
        }));
        return res.json({ message: "Confirmed. You can now login." });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Confirmation failed" });
    }
});
router.post("/resend", async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: "Missing email" });
    try {
        const secretHash = (0, secretHash_1.generateSecretHash)(email, CLIENT_ID, CLIENT_SECRET);
        await awsClient_1.cognitoClient.send(new client_cognito_identity_provider_1.ResendConfirmationCodeCommand({
            ClientId: CLIENT_ID,
            Username: email,
            SecretHash: secretHash
        }));
        return res.json({ message: "Confirmation code resent." });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Resend failed" });
    }
});
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Missing fields" });
    try {
        const secretHash = (0, secretHash_1.generateSecretHash)(email, CLIENT_ID, CLIENT_SECRET);
        const authResp = await awsClient_1.cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
                SECRET_HASH: secretHash
            }
        }));
        const tokens = authResp.AuthenticationResult;
        if (!tokens?.AccessToken) {
            return res.status(400).json({ error: "Unable to login" });
        }
        const userData = await awsClient_1.cognitoClient.send(new client_cognito_identity_provider_1.GetUserCommand({ AccessToken: tokens.AccessToken }));
        const attrs = {};
        userData.UserAttributes?.forEach(a => {
            if (a.Name)
                attrs[a.Name] = a.Value ?? "";
        });
        return res.json({
            AccessToken: tokens.AccessToken,
            IdToken: tokens.IdToken,
            RefreshToken: tokens.RefreshToken,
            ExpiresIn: tokens.ExpiresIn,
            TokenType: tokens.TokenType,
            name: attrs.name || "",
            email: attrs.email || "",
            picture: attrs.picture || "",
            phone_number: attrs.phone_number || "",
            birthdate: attrs.birthdate || "",
            gender: attrs.gender || ""
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Login failed" });
    }
});
router.get("/protected-route", auth_1.authMiddleware, (req, res) => {
    return res.json({ message: "You accessed a protected route", user: req.user || null });
});
exports.default = router;

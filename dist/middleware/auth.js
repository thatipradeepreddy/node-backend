"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const region = process.env.AWS_REGION || "ap-south-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
const client = (0, jwks_rsa_1.default)({ jwksUri });
function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        if (err)
            return callback(err);
        const pub = key?.getPublicKey();
        callback(null, pub);
    });
}
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
        return res.status(401).json({ error: "Missing Authorization header" });
    const token = auth.slice("Bearer ".length);
    jsonwebtoken_1.default.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
        if (err)
            return res.status(401).json({ error: "Invalid token", detail: err.message });
        req.user = decoded;
        next();
    });
}

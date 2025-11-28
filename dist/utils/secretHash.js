"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecretHash = generateSecretHash;
const crypto_1 = __importDefault(require("crypto"));
function generateSecretHash(username, clientId, clientSecret) {
    return crypto_1.default
        .createHmac("SHA256", clientSecret)
        .update(username + clientId)
        .digest("base64");
}

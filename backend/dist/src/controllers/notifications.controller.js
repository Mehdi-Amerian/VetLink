"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = getPreferences;
exports.updatePreferences = updatePreferences;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const zod_1 = require("zod");
async function getPreferences(req, res) {
    const userId = req.user.userId;
    const pref = await prismaClient_1.default.notificationPreference.upsert({
        where: { userId },
        create: { userId }, // defaults emailEnabled: true
        update: {},
    });
    res.json(pref);
}
const PrefSchema = zod_1.z.object({ emailEnabled: zod_1.z.boolean() });
async function updatePreferences(req, res) {
    const userId = req.user.userId;
    const { emailEnabled } = PrefSchema.parse(req.body);
    const pref = await prismaClient_1.default.notificationPreference.upsert({
        where: { userId },
        update: { emailEnabled },
        create: { userId, emailEnabled },
    });
    res.json(pref);
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const router = (0, express_1.Router)();
router.get('/healthz', (_req, res) => res.status(200).send('ok'));
router.get('/readyz', async (_req, res) => {
    try {
        await prismaClient_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({ status: 'ready' });
    }
    catch {
        res.status(503).json({ error: 'not-ready' });
    }
});
exports.default = router;

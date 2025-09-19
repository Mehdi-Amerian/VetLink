"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyToken_1 = require("../middlewares/verifyToken");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
router.get('/preferences', verifyToken_1.verifyToken, notifications_controller_1.getPreferences);
router.patch('/preferences', verifyToken_1.verifyToken, notifications_controller_1.updatePreferences);
exports.default = router;

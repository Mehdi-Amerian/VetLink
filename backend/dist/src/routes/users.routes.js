"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyToken_1 = require("../middlewares/verifyToken");
const users_controller_1 = require("../controllers/users.controller");
const router = (0, express_1.Router)();
router.patch("/me", verifyToken_1.verifyToken, users_controller_1.updateMe);
exports.default = router;

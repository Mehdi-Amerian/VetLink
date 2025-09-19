"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const verifyToken_1 = require("../middlewares/verifyToken");
const router = (0, express_1.Router)();
// Route for user signup
router.post('/signup', auth_controller_1.signup);
// Route for user login
router.post('/login', auth_controller_1.login);
//Protectd route
router.get('/me', verifyToken_1.verifyToken, auth_controller_1.getMe);
exports.default = router;

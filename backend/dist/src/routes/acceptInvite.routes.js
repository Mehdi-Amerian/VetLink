"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const acceptInvite_controller_1 = require("../controllers/acceptInvite.controller");
const router = (0, express_1.Router)();
router.post('/accept-invite', acceptInvite_controller_1.acceptInvite);
exports.default = router;

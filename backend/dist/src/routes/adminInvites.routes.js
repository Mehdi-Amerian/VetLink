"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyToken_1 = require("../middlewares/verifyToken");
const adminInvites_controller_1 = require("../controllers/adminInvites.controller");
const router = (0, express_1.Router)();
// SUPER_ADMIN: invite clinic admin
router.post('/clinics/invite-admin', verifyToken_1.verifyToken, adminInvites_controller_1.inviteClinicAdmin);
// CLINIC_ADMIN: invite vet
router.post('/vets/invite', verifyToken_1.verifyToken, adminInvites_controller_1.inviteVet);
exports.default = router;

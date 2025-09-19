"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clinics_controller_1 = require("../controllers/clinics.controller");
const verifyToken_1 = require("../middlewares/verifyToken");
const checkRole_1 = require("../middlewares/checkRole");
const router = (0, express_1.Router)();
// Public access
router.get('/', clinics_controller_1.getClinics);
router.get('/:id', clinics_controller_1.getClinicById);
// Admin-only route
router.post('/', verifyToken_1.verifyToken, (0, checkRole_1.checkRole)('CLINIC_ADMIN'), clinics_controller_1.createClinic);
exports.default = router;

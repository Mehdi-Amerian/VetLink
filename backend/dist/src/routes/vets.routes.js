"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vets_controller_1 = require("../controllers/vets.controller");
const verifyToken_1 = require("../middlewares/verifyToken");
const checkRole_1 = require("../middlewares/checkRole");
const router = (0, express_1.Router)();
// Public routes
router.get('/', vets_controller_1.getVets);
router.get('/:id', vets_controller_1.getVetById);
// Admin-only vet registration
router.post('/', verifyToken_1.verifyToken, (0, checkRole_1.checkRole)(['CLINIC_ADMIN', 'SUPER_ADMIN']), vets_controller_1.createVet);
exports.default = router;

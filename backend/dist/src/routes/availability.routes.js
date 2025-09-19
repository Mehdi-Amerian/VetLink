"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availability_controller_1 = require("../controllers/availability.controller");
const verifyToken_1 = require("../middlewares/verifyToken");
const checkRole_1 = require("../middlewares/checkRole");
const router = (0, express_1.Router)();
// VET creates availability
router.post('/', verifyToken_1.verifyToken, (0, checkRole_1.checkRole)('VET'), availability_controller_1.addAvailability);
// Anyone can view vet's schedule
router.get('/:vetId', availability_controller_1.getAvailabilityByVet);
// Anyone can view available appointment start times
// GET /api/availability/vets/:vetId/available-slots?date=YYYY-MM-DD&duration=30
router.get('/vets/:vetId/available-slots', availability_controller_1.getAvailableSlots);
router.get('/clinics/:clinicId/available-slots', availability_controller_1.getClinicAvailableSlots);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pets_controller_1 = require("../controllers/pets.controller");
const verifyToken_1 = require("../middlewares/verifyToken");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(verifyToken_1.verifyToken);
// Create a new pet
router.post('/', pets_controller_1.createPet);
// Get all pets for the logged-in user
router.get('/', pets_controller_1.getMyPets);
// Update a pet
router.patch('/:id', pets_controller_1.updatePet);
// Delete a pet
router.delete('/:id', pets_controller_1.deletePet);
exports.default = router;

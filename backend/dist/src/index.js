"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const pets_routes_1 = __importDefault(require("./routes/pets.routes"));
const clinics_routes_1 = __importDefault(require("./routes/clinics.routes"));
const vets_routes_1 = __importDefault(require("./routes/vets.routes"));
const availability_routes_1 = __importDefault(require("./routes/availability.routes"));
const appointments_routes_1 = __importDefault(require("./routes/appointments.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const reminderJob_1 = require("./jobs/reminderJob");
const docs_1 = __importDefault(require("./routes/docs"));
// Load environment variables from .env file
dotenv_1.default.config();
//Create an Express application
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/pets', pets_routes_1.default);
app.use('/api/clinics', clinics_routes_1.default);
app.use('/api/vets', vets_routes_1.default);
app.use('/api/availability', availability_routes_1.default);
app.use('/api/appointments', appointments_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
// Schedule the reminder job
(0, reminderJob_1.scheduleReminderJob)();
// Basic route to check server status
app.get('/', (req, res) => {
    res.send('VetLink API is running');
});
//docs (redoc + openapi.yaml)
app.use('/', docs_1.default);
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});
// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
exports.default = app;

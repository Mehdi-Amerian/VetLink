import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import petsRoutes from './routes/pets.routes';
import clinicsRoutes from './routes/clinics.routes';
import vetRoutes from './routes/vets.routes';
import availabilityRoutes from './routes/availability.routes';
import appointmentsRoutes from './routes/appointments.routes';

// Load environment variables from .env file
dotenv.config();

//Create an Express application
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/clinics', clinicsRoutes);
app.use('/api/vets', vetRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentsRoutes);

app.get('/', (req, res) => {
  res.send('VetLink API is running');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
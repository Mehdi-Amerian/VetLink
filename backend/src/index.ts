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
  import dashboardRoutes from './routes/dashboard.routes';
  import notificationsRouter from './routes/notifications.routes';
  import { scheduleReminderJob } from './jobs/reminderJob';
  import docsRouter from './routes/docs';
  import systemRoutes from './routes/system';

  // Load environment variables from .env file
  dotenv.config();

  //Create an Express application
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: ['http://localhost:3001', 'https://app.vetlink.fi'], credentials: true }));
  app.use(express.json());
  app.set('trust proxy', 1);

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/pets', petsRoutes);
  app.use('/api/clinics', clinicsRoutes);
  app.use('/api/vets', vetRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationsRouter);

  // Schedule the reminder job
  scheduleReminderJob();

  // Basic route to check server status
  app.get('/', (req, res) => {
    res.send('VetLink API is running');
  });

  // Health and readiness probes
  app.use('/', systemRoutes);

  //docs (redoc + openapi.yaml)
  app.use('/', docsRouter);

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  });

  // Start the server
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  export default app;
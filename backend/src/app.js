const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const queueRoutes = require('./routes/queue.routes');
const appointmentRoutes = require('./routes/appointment.routes');

const app = express();

// Security and CORS configuration
app.use(cors({
  origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (compliant with no-patient-data rule)
app.use(requestLogger);

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/appointments', appointmentRoutes);

// Optional: Serve frontend static files if built in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Catch-all for React Router SPA (if accessed via Express directly)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexHtml = path.join(frontendDist, 'index.html');
    return res.sendFile(indexHtml, (err) => {
      if (err) {
        next();
      }
    });
  }
  next();
});

// Centralized 404 & error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

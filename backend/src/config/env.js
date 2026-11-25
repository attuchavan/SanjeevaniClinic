const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: path.resolve(__dirname, '../../', process.env.DB_PATH || './data/clinic.db'),
  jwtSecret: process.env.JWT_SECRET || 'sanjeevani_clinic_secret_replace_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  clinicName: process.env.CLINIC_NAME || 'SANJEEVANI CLINIC',
};

module.exports = config;

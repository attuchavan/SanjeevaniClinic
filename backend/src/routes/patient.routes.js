const express = require('express');
const patientService = require('../services/patient.service');
const { createPatientSchema, updatePatientSchema } = require('../validators/patient.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All patient endpoints require authentication (both DOCTOR and RECEPTIONIST)
router.use(authenticate);

/**
 * GET /api/patients/check-duplicate?mobile=9876543210
 * Fast duplicate mobile lookup
 */
router.get('/check-duplicate', (req, res, next) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(200).json({ success: true, count: 0, duplicates: [] });
    }
    const duplicates = patientService.checkDuplicateMobile(mobile);
    res.status(200).json({
      success: true,
      count: duplicates.length,
      duplicates,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients
 * Search and paginated list of patients
 */
router.get('/', (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const result = patientService.searchPatients({
      query: q || '',
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients/:id
 * Retrieve patient profile and full visit history
 */
router.get('/:id', (req, res, next) => {
  try {
    const patient = patientService.getPatientById(req.params.id);
    res.status(200).json({
      success: true,
      data: { patient },
    });
  } catch (err) {
    if (err.message === 'Patient not found') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    next(err);
  }
});

/**
 * POST /api/patients
 * Register a new patient (generates UHID)
 */
router.post('/', async (req, res, next) => {
  try {
    const validatedData = createPatientSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newPatient = patientService.registerPatient(validatedData, req.user.id, clientIp);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: { patient: newPatient },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/patients/:id
 * Update patient profile
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = updatePatientSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const updated = patientService.updatePatient(req.params.id, validatedData, req.user.id, clientIp);

    res.status(200).json({
      success: true,
      message: 'Patient profile updated successfully',
      data: { patient: updated },
    });
  } catch (err) {
    if (err.message === 'Patient not found') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    next(err);
  }
});

module.exports = router;

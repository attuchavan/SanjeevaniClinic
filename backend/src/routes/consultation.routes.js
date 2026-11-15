const express = require('express');
const router = express.Router();
const consultationService = require('../services/consultation.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { saveCasePaperSchema, savePrescriptionSchema } = require('../validators/consultation.validator');

/**
 * GET /api/consultation/visit/:visitId
 * Get complete consultation workspace for a visit (Doctor only)
 */
router.get(
  '/visit/:visitId',
  authenticate,
  authorize('DOCTOR'),
  (req, res, next) => {
    try {
      const workspace = consultationService.getConsultationWorkspace(Number(req.params.visitId));
      res.json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/consultation/visit/:visitId/case-paper
 * Save/update case paper notes, vitals, examination & diagnosis (Doctor only)
 */
router.put(
  '/visit/:visitId',
  authenticate,
  authorize('DOCTOR'),
  (req, res, next) => {
    try {
      const validated = saveCasePaperSchema.parse(req.body);
      const updated = consultationService.saveCasePaper(
        Number(req.params.visitId),
        validated,
        req.user.id,
        req.ip
      );
      res.json({
        success: true,
        message: validated.isFinalized ? 'Case paper finalized' : 'Case paper saved as draft',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/consultation/visit/:visitId/case-paper (explicit path)
 */
router.put(
  '/visit/:visitId/case-paper',
  authenticate,
  authorize('DOCTOR'),
  (req, res, next) => {
    try {
      const validated = saveCasePaperSchema.parse(req.body);
      const updated = consultationService.saveCasePaper(
        Number(req.params.visitId),
        validated,
        req.user.id,
        req.ip
      );
      res.json({
        success: true,
        message: validated.isFinalized ? 'Case paper finalized' : 'Case paper draft saved',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/consultation/visit/:visitId/prescription
 * Save or finalize prescription with structured medicines (Doctor only)
 * Receptionist attempting this is blocked with 403 Forbidden!
 */
router.put(
  '/visit/:visitId/prescription',
  authenticate,
  authorize('DOCTOR'),
  (req, res, next) => {
    try {
      const validated = savePrescriptionSchema.parse(req.body);
      const updated = consultationService.savePrescription(
        Number(req.params.visitId),
        validated,
        req.user.id,
        req.ip
      );
      res.json({
        success: true,
        message: validated.isFinalized ? 'Prescription finalized and consultation marked completed' : 'Prescription draft saved',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/consultation/visit/:visitId/prescription/print
 * Fetch printable prescription layout (Doctor & Receptionist)
 */
router.get(
  '/visit/:visitId/prescription/print',
  authenticate,
  authorize('DOCTOR', 'RECEPTIONIST'),
  (req, res, next) => {
    try {
      const printable = consultationService.getPrintablePrescription(Number(req.params.visitId));
      res.json({
        success: true,
        data: printable,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/consultation/visit/:visitId/case-paper/print
 * Fetch printable case paper layout (Doctor & Receptionist)
 */
router.get(
  '/visit/:visitId/case-paper/print',
  authenticate,
  authorize('DOCTOR', 'RECEPTIONIST'),
  (req, res, next) => {
    try {
      const printable = consultationService.getPrintableCasePaper(Number(req.params.visitId));
      res.json({
        success: true,
        data: printable,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/consultation/prescriptions
 * Search & archive list of prescriptions (Doctor & Receptionist)
 */
router.get(
  '/prescriptions',
  authenticate,
  authorize('DOCTOR', 'RECEPTIONIST'),
  (req, res, next) => {
    try {
      const result = consultationService.listPrescriptions({
        search: req.query.search,
        date: req.query.date,
        page: req.query.page,
        limit: req.query.limit,
      });
      res.json({
        success: true,
        data: result.prescriptions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;


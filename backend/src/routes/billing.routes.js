const express = require('express');
const router = express.Router();
const billingService = require('../services/billing.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createPaymentSchema } = require('../validators/billing.validator');

// All billing endpoints require authentication
router.use(authenticate);

/**
 * POST /api/billing/payments
 * Record consultation fee payment & generate receipt (Receptionist or Doctor)
 */
router.post('/payments', authorize('RECEPTIONIST', 'DOCTOR'), (req, res, next) => {
  try {
    const validated = createPaymentSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const payment = billingService.createPayment(validated, req.user.id, clientIp);

    res.status(201).json({
      success: true,
      message: `Receipt ${payment.receiptNumber} generated successfully`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/payments
 * Search and filter receipts
 */
router.get('/payments', authorize('RECEPTIONIST', 'DOCTOR'), (req, res, next) => {
  try {
    const result = billingService.searchPayments({
      query: req.query.query || req.query.q,
      paymentMode: req.query.paymentMode,
      paymentStatus: req.query.paymentStatus,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      data: result.payments,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/summary
 * Daily and monthly collections accounting summary
 */
router.get('/summary', authorize('RECEPTIONIST', 'DOCTOR'), (req, res, next) => {
  try {
    const summary = billingService.getCollectionsSummary(req.query.date);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/visit/:visitId
 * Get payment breakdown & balance for a visit
 */
router.get('/visit/:visitId', authorize('RECEPTIONIST', 'DOCTOR'), (req, res, next) => {
  try {
    const data = billingService.getPaymentsByVisit(Number(req.params.visitId));
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/payments/:id
 * Retrieve payment receipt details
 */
router.get('/payments/:id', authorize('RECEPTIONIST', 'DOCTOR'), (req, res, next) => {
  try {
    const payment = billingService.getPaymentById(Number(req.params.id));
    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/payments/:id/print
 * Fetch printable receipt data
 */
router.get('/payments/:id/print', authorize('RECEPTIONIST', 'DOCTOR'), (req, res, next) => {
  try {
    const printable = billingService.getPrintableReceipt(Number(req.params.id));
    res.json({
      success: true,
      data: printable,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

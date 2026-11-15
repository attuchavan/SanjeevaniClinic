const express = require('express');
const queueService = require('../services/queue.service');
const { createVisitSchema, updateVisitStatusSchema } = require('../validators/visit.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/queue
 * Retrieve live queue and summary metrics for today
 */
router.get('/', (req, res, next) => {
  try {
    const { date } = req.query;
    const queueData = queueService.getTodayQueue(date);
    res.status(200).json({
      success: true,
      data: queueData,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/queue/visit
 * Create a walk-in visit / issue queue token (Receptionist or Doctor)
 */
router.post('/visit', (req, res, next) => {
  try {
    const validatedData = createVisitSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newVisit = queueService.createVisit(validatedData, req.user.id, clientIp);

    res.status(201).json({
      success: true,
      message: `Token #${newVisit.token_number} assigned successfully`,
      data: { visit: newVisit },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/queue/call-next
 * Doctor calls the next patient in queue (Doctor only)
 */
router.post('/call-next', authorize('DOCTOR'), (req, res, next) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const calledVisit = queueService.callNextPatient(req.user.id, clientIp);

    res.status(200).json({
      success: true,
      message: `Called Token #${calledVisit.token_number} (${calledVisit.full_name})`,
      data: { visit: calledVisit },
    });
  } catch (err) {
    if (err.message.includes('No waiting patients')) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * PATCH /api/queue/visit/:id/status
 * Transition visit status (CALLED, IN_PROGRESS, COMPLETED, CANCELLED) or toggle EMERGENCY
 */
router.patch('/visit/:id/status', (req, res, next) => {
  try {
    const validatedData = updateVisitStatusSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const updated = queueService.updateVisitStatus(
      req.params.id,
      validatedData,
      req.user.id,
      clientIp
    );

    res.status(200).json({
      success: true,
      message: 'Queue status updated',
      data: { visit: updated },
    });
  } catch (err) {
    if (err.message === 'Visit not found') {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    next(err);
  }
});

module.exports = router;


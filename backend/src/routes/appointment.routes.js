const express = require('express');
const appointmentService = require('../services/appointment.service');
const { bookAppointmentSchema } = require('../validators/appointment.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/appointments
 * List appointments with optional date and status filters
 */
router.get('/', (req, res, next) => {
  try {
    const { date, status } = req.query;
    const appointments = appointmentService.getAppointments({ date, status });
    res.status(200).json({
      success: true,
      data: { appointments },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/appointments
 * Book a new appointment
 */
router.post('/', (req, res, next) => {
  try {
    const validatedData = bookAppointmentSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newAppointment = appointmentService.bookAppointment(validatedData, req.user.id, clientIp);

    res.status(201).json({
      success: true,
      message: `Appointment #${newAppointment.appointment_number} booked successfully`,
      data: { appointment: newAppointment },
    });
  } catch (err) {
    if (err.message.includes('already booked')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/appointments/:id/check-in
 * Check in patient for appointment -> converts into live queue visit token
 */
router.post('/:id/check-in', (req, res, next) => {
  try {
    const { priority = 'NORMAL' } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newVisit = appointmentService.checkInAppointment(
      req.params.id,
      priority,
      req.user.id,
      clientIp
    );

    res.status(201).json({
      success: true,
      message: `Checked in! Assigned Token #${newVisit.token_number}`,
      data: { visit: newVisit },
    });
  } catch (err) {
    if (err.message.includes('already been checked in') || err.message.includes('cancelled')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

/**
 * PATCH /api/appointments/:id/cancel
 * Cancel an appointment
 */
router.patch('/:id/cancel', (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const cancelled = appointmentService.cancelAppointment(
      req.params.id,
      reason,
      req.user.id,
      clientIp
    );

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled',
      data: { appointment: cancelled },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


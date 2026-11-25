const express = require('express');
const authService = require('../services/auth.service');
const { loginSchema, changePasswordSchema } = require('../validators/auth.validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * POST /api/auth/login
 * Public endpoint to authenticate doctor or receptionist
 */
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const result = await authService.login({
      username: validatedData.username,
      password: validatedData.password,
      clientIp,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (err) {
    if (err.message === 'Invalid username or password' || err.message.includes('deactivated')) {
      return res.status(401).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint to get current authenticated user profile
 */
router.get('/me', authenticate, (req, res, next) => {
  try {
    const user = authService.getUserById(req.user.id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/change-password
 * Protected endpoint to change current user's password
 */
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const result = await authService.changePassword(req.user.id, {
      currentPassword: validatedData.currentPassword,
      newPassword: validatedData.newPassword,
      clientIp,
    });

    res.status(200).json(result);
  } catch (err) {
    if (err.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Protected endpoint to record logout in audit logs
 */
router.post('/logout', authenticate, (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  authService.recordLogout(req.user.id, clientIp);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Diagnostic test route to verify role protection:
 * GET /api/auth/doctor-only
 */
router.get('/doctor-only', authenticate, authorize('DOCTOR'), (req, res) => {
  res.status(200).json({
    success: true,
    message: `Welcome Doctor ${req.user.fullName}. You have verified DOCTOR-level clearance.`,
  });
});

/**
 * Diagnostic test route to verify receptionist protection:
 * GET /api/auth/receptionist-only
 */
router.get('/receptionist-only', authenticate, authorize('RECEPTIONIST'), (req, res) => {
  res.status(200).json({
    success: true,
    message: `Welcome ${req.user.fullName}. You have verified RECEPTIONIST-level clearance.`,
  });
});

module.exports = router;


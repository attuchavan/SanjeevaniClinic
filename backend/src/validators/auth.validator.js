const { z } = require('zod');

const loginSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(4, 'Password must be at least 4 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, 'New password must be at least 6 characters'),
});

module.exports = {
  loginSchema,
  changePasswordSchema,
};


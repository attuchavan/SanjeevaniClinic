const { z } = require('zod');

const createPaymentSchema = z.object({
  visitId: z.number({ required_error: 'Visit ID is required' }).int().positive(),
  patientId: z.number({ required_error: 'Patient ID is required' }).int().positive(),
  amountCharged: z.number({ required_error: 'Amount charged is required' }).min(0, 'Amount charged cannot be negative'),
  amountPaid: z.number({ required_error: 'Amount paid is required' }).min(0, 'Amount paid cannot be negative'),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER'], {
    required_error: 'Payment mode must be CASH, UPI, CARD, or OTHER',
  }).default('CASH'),
  transactionReference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
});

module.exports = {
  createPaymentSchema,
};

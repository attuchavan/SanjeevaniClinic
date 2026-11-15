const { z } = require('zod');

const createVisitSchema = z.object({
  patientId: z.number({ required_error: 'Patient ID is required' }).int().positive(),
  appointmentId: z.number().int().positive().optional().nullable(),
  visitType: z.enum(['NEW', 'FOLLOW_UP'], {
    required_error: 'Visit type must be NEW or FOLLOW_UP',
  }).default('NEW'),
  priority: z.enum(['NORMAL', 'EMERGENCY']).default('NORMAL'),
});

const updateVisitStatusSchema = z.object({
  status: z.enum(['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['NORMAL', 'EMERGENCY']).optional(),
});

module.exports = {
  createVisitSchema,
  updateVisitStatusSchema,
};


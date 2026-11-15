const { z } = require('zod');

const bookAppointmentSchema = z.object({
  patientId: z.number({ required_error: 'Patient ID is required' }).int().positive(),
  appointmentDate: z
    .string({ required_error: 'Appointment date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
  appointmentTime: z
    .string({ required_error: 'Appointment time is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24h format HH:MM (e.g. 10:30)'),
  type: z.enum(['NEW', 'FOLLOW_UP', 'ROUTINE']).default('NEW'),
  notes: z.string().trim().max(300).optional().nullable(),
});

module.exports = {
  bookAppointmentSchema,
};

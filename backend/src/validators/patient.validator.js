const { z } = require('zod');

const createPatientSchema = z.object({
  fullName: z
    .string({ required_error: 'Patient full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  mobileNumber: z
    .string({ required_error: 'Mobile number is required' })
    .trim()
    .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    required_error: 'Please select a gender',
  }),
  age: z
    .number()
    .int('Age must be an integer')
    .min(0, 'Age cannot be negative')
    .max(125, 'Please enter a realistic age')
    .optional()
    .nullable(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().trim().max(250).optional().nullable().or(z.literal('')),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN', ''])
    .optional()
    .nullable(),
  allergies: z.string().trim().max(300).optional().nullable().or(z.literal('')),
  emergencyContact: z.string().trim().max(50).optional().nullable().or(z.literal('')),
}).refine(data => data.age !== undefined && data.age !== null || (data.dob && data.dob.length > 0), {
  message: 'Either age or date of birth must be provided',
  path: ['age'],
});

const updatePatientSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  mobileNumber: z.string().trim().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  age: z.number().int().min(0).max(125).optional().nullable(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  address: z.string().trim().max(250).optional().nullable().or(z.literal('')),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN', '']).optional().nullable(),
  allergies: z.string().trim().max(300).optional().nullable().or(z.literal('')),
  emergencyContact: z.string().trim().max(50).optional().nullable().or(z.literal('')),
});

module.exports = {
  createPatientSchema,
  updatePatientSchema,
};


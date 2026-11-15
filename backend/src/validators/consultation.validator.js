const { z } = require('zod');

const vitalsSchema = z.object({
  bp: z.string().trim().max(30).optional().nullable(),
  pulse: z.string().trim().max(20).optional().nullable(),
  temperature: z.string().trim().max(20).optional().nullable(),
  spo2: z.string().trim().max(20).optional().nullable(),
  weight: z.string().trim().max(20).optional().nullable(),
  height: z.string().trim().max(20).optional().nullable(),
  bmi: z.string().trim().max(20).optional().nullable(),
}).optional().nullable();

const medicineItemSchema = z.object({
  medicineName: z.string({ required_error: 'Medicine name is required' }).trim().min(1, 'Medicine name cannot be empty'),
  dosage: z.string().trim().optional().nullable().default('1 tablet'),
  frequency: z.string().trim().optional().nullable().default('1-0-1'),
  timing: z.string().trim().optional().nullable().default('After food'),
  duration: z.string().trim().optional().nullable().default('5 days'),
  instructions: z.string().trim().optional().nullable(),
});

const saveCasePaperSchema = z.object({
  chiefComplaints: z.string().trim().optional().nullable().default(''),
  medicalHistory: z.string().trim().optional().nullable(),
  allergies: z.string().trim().optional().nullable(),
  clinicalExamination: z.string().trim().optional().nullable(),
  vitals: vitalsSchema,
  diagnosis: z.string().trim().optional().nullable(),
  doctorNotes: z.string().trim().optional().nullable(),
  followUpInstructions: z.string().trim().optional().nullable(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable().or(z.literal('')),
  isFinalized: z.boolean().optional().default(false),
});

const savePrescriptionSchema = z.object({
  diagnosisSummary: z.string().trim().optional().nullable(),
  adviceNotes: z.string().trim().optional().nullable(),
  medicines: z.array(medicineItemSchema).default([]),
  isFinalized: z.boolean().optional().default(false),
});

module.exports = {
  saveCasePaperSchema,
  savePrescriptionSchema,
};

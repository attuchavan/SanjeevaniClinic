-- Dr. Sharad Motugade Clinic Management System
-- Migration 001: Initial Core Schema

-- 1. Users table (Doctor and Receptionist accounts)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('DOCTOR', 'RECEPTIONIST')),
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 2. Patients table (Permanent patient profile)
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uhid TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  dob TEXT,
  gender TEXT NOT NULL CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
  mobile_number TEXT NOT NULL,
  address TEXT,
  blood_group TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 3. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_number TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('NEW', 'FOLLOW_UP', 'ROUTINE')) DEFAULT 'NEW',
  status TEXT NOT NULL CHECK(status IN ('SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW')) DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 4. Visits table (Queue tracking & consultation tokens)
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_number TEXT UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
  visit_time TEXT NOT NULL DEFAULT (time('now', 'localtime')),
  visit_type TEXT NOT NULL CHECK(visit_type IN ('NEW', 'FOLLOW_UP')),
  token_number INTEGER NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('NORMAL', 'EMERGENCY')) DEFAULT 'NORMAL',
  status TEXT NOT NULL CHECK(status IN ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'WAITING',
  called_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 5. Case Papers table (New and Old patient formats)
CREATE TABLE IF NOT EXISTS case_papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  case_paper_type TEXT NOT NULL CHECK(case_paper_type IN ('NEW', 'OLD')),
  chief_complaints TEXT,
  medical_history TEXT,
  allergies TEXT,
  clinical_examination TEXT,
  vitals_json TEXT,
  diagnosis TEXT,
  doctor_notes TEXT,
  follow_up_instructions TEXT,
  follow_up_date TEXT,
  is_finalized INTEGER NOT NULL DEFAULT 0,
  finalized_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 6. Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  diagnosis_summary TEXT,
  advice_notes TEXT,
  is_finalized INTEGER NOT NULL DEFAULT 0,
  finalized_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 7. Prescription Medicines table (Individual medicines per prescription)
CREATE TABLE IF NOT EXISTS prescription_medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 8. Payments table (Consultation and visit fee collections)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_number TEXT UNIQUE NOT NULL,
  visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  amount_charged REAL NOT NULL,
  amount_paid REAL NOT NULL,
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'OTHER')) DEFAULT 'CASH',
  payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PARTIAL', 'PENDING')) DEFAULT 'PAID',
  transaction_reference TEXT,
  collected_by INTEGER REFERENCES users(id),
  notes TEXT,
  payment_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 9. Attachments table (Reports, X-rays, external files stored on local disk)
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  notes TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 10. Audit Logs table (Compliance, system operations trace)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile_number);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date_status ON visits(visit_date, status);
CREATE INDEX IF NOT EXISTS idx_case_papers_visit ON case_papers(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescription_medicines_presc ON prescription_medicines(prescription_id);
CREATE INDEX IF NOT EXISTS idx_payments_visit ON payments(visit_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);


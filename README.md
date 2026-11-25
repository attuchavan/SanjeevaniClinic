# SANJEEVANI CLINIC MANAGEMENT SYSTEM
### *Offline-First Local Area Network (LAN) Clinic Management System*
**Consultant Physician:** Dr. Sharad Motugade  
**Clinic Name:** SANJEEVANI CLINIC  
**Architecture:** Centralized Offline-First Two-Computer LAN Architecture (SQLite + Express + Socket.IO + React Vite)

---

## 1. System Architecture Overview

```
                      CLINIC LOCAL AREA NETWORK (LAN)
                      ================================
                                     │
      ┌──────────────────────────────┴──────────────────────────────┐
      │                                                             │
┌─────▼────────────────────────────────────┐       ┌────────────────▼────────────────────────┐
│  COMPUTER 1 (Main Workstation / Doctor)  │       │  COMPUTER 2 (Receptionist Terminal)     │
│                                          │       │                                         │
│  • React Frontend (Port 3000 / 5000)     │       │  • Web Browser (Chrome / Edge)          │
│  • Node.js Express API Server (Port 5000)│◄──────┤  • Connects via LAN:                    │
│  • Socket.IO Real-time Sync Server       │       │    http://<COMPUTER_1_IP>:5000          │
│  • SQLite Local Database (clinic.db)     │       │  • Strict REST API access only          │
│  • Local File Storage & Encrypted Backup │       │  • Zero direct SQLite file access       │
└──────────────────────────────────────────┘       └─────────────────────────────────────────┘
```

- **100% Offline Capability:** Operates entirely within the clinic without requiring an active internet connection.
- **Centralized Database:** Local SQLite with WAL mode (`PRAGMA journal_mode = WAL`) and foreign key enforcement (`PRAGMA foreign_keys = ON`) hosted on Computer 1.
- **LAN Security:** Express binds to `0.0.0.0:5000` with JWT authorization, bcrypt password hashing, and parameterized SQL queries.

---

## 2. Default Clinic Accounts (RBAC)

| Role | Username | Password | Workstation Access Scope |
| :--- | :--- | :--- | :--- |
| **Doctor** | `doctor` | `doctor123` | Dr. Sharad Motugade: Live patient queue, consultation case sheets, medical examination, clinical diagnosis, prescriptions archive |
| **Receptionist** | `receptionist` | `reception123` | Front Desk: New patient registration, UHID issuance, duplicate detection, patient directory, queue monitoring, billing |

---

## 3. Directory Structure

```
SanjeevaniClinic/
├── backend/
│   ├── data/                  # SQLite database file (clinic.db) in WAL mode
│   ├── src/
│   │   ├── config/            # Database and environment configurations
│   │   ├── database/          # Migrations (001_initial_schema.sql) and seeds
│   │   ├── middleware/        # JWT auth, role validation, request logging
│   │   ├── routes/            # Express endpoints (auth, patients, queue, appointments, consultation, billing)
│   │   ├── services/          # Business logic services
│   │   ├── socket/            # Real-time Socket.IO synchronization
│   │   ├── utils/             # Sequential UHID, Visit, Appointment & Receipt generators
│   │   └── validators/        # Zod validation schemas
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Modals, Print pads (Rx, Case Paper, Receipts), UI elements
│   │   ├── context/           # AuthContext (JWT management)
│   │   ├── layouts/           # DoctorLayout & ReceptionistLayout
│   │   ├── pages/             # Doctor & Receptionist workstation pages
│   │   ├── services/          # Axios HTTP clients and Socket.IO listeners
│   │   ├── App.jsx            # Protected role routes
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
└── package.json               # Root proxy scripts
```

---

## 4. Key Modules Implemented

1. **Phase 1: Foundation & Infrastructure**
   - SQLite in WAL mode with 11 relational tables and foreign keys.
   - Socket.IO real-time communication server.
   - Comprehensive `/api/health` diagnostics check.

2. **Phase 2: Authentication & Role-Based Access Control (RBAC)**
   - Doctor and Receptionist login with bcrypt password hashing.
   - JWT authentication (12-hour session) with immutable SQLite `audit_logs`.
   - Separate workstation shells (`DoctorLayout` and `ReceptionistLayout`).

3. **Phase 3: Patient Management**
   - Sequential Unique Health ID generation: `SC-YYYY-XXXX`.
   - Real-time duplicate mobile number detection.
   - Bidirectional Age-to-Date-of-Birth calculation.
   - Patient directory with debounced search and detailed profile timeline.

4. **Phase 4: Live Real-Time Queue & Appointments**
   - Sequential tokens and visit numbering (`VN-YYYY-XXXX`).
   - Emergency triage prioritisation in SQLite queries.
   - Doctor "Call Next" with instantaneous Socket.IO queue broadcast.
   - Advance appointment booking with duplicate check-in prevention (`APT-YYYY-XXXX`).

5. **Phase 5: Doctor Consultation & Prescriptions**
   - Electronic Case Paper supporting both **New Patient** and **Old Patient (Follow-up)** formats.
   - Automatic retrieval of previous visit history, past complaints, and prior medicines side-by-side.
   - Structured prescription builder with dosage schedules (`1-0-1`, timing, duration).
   - Fast drug pickers for common medicines prescribed by Dr. Sharad Motugade.
   - Printable branded prescription pad (`PrintablePrescriptionModal`) and case paper sheet (`PrintableCasePaperModal`).
   - Doctor's prescription archive with multi-attribute search.

6. **Phase 6: Billing & Payment Collections**
   - Sequential receipt numbering: `REC-YYYY-XXXX`.
   - Native Cash, UPI (with UTR reference), and Card support.
   - Automatic calculation of paid, partial, and pending balances.
   - Daily and monthly revenue accounting & cash reconciliation.
   - Printable official fee receipts (`PrintableReceiptModal`) with English words conversion.

---

## 5. Running the Application Locally

### Development Mode:
```bash
# Terminal 1: Start Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend (Port 3000)
cd frontend
npm run dev
```

### Production Mode (Host on Computer 1):
```bash
# 1. Build the React SPA
cd frontend
npm run build

# 2. Start the unified clinic server from backend
cd ../backend
npm start
```

### Accessing from Computer 2 (Receptionist Computer):
1. Note the LAN IP displayed in the terminal upon server startup (e.g. `192.168.1.15`).
2. On Computer 2, open Chrome/Edge and visit:
   `http://192.168.1.15:5000`

---

## 6. Automated Testing Suites

To verify all system modules, run from `backend`:

```bash
node src/test_phase1.js   # Infrastructure & WAL
node src/test_phase2.js   # Auth & RBAC
node src/test_phase3.js   # Patient Management
node src/test_phase4.js   # Queue & Appointments
node src/test_phase5.js   # Consultation & Prescriptions
node src/test_phase6.js   # Billing & Payments
```

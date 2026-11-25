import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';

// Layouts
import DoctorLayout from './layouts/DoctorLayout';
import ReceptionistLayout from './layouts/ReceptionistLayout';

// Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import DiagnosticsView from './components/common/DiagnosticsView';
import PhasePlaceholder from './components/common/PhasePlaceholder';

// Phase 3 Modules: Patient Management
import NewPatientRegistration from './pages/receptionist/NewPatientRegistration';
import PatientDirectory from './pages/common/PatientDirectory';
import PatientProfile from './pages/common/PatientProfile';

// Root Redirector based on authenticated role
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xs text-slate-500 font-medium animate-pulse">
          Loading Sanjeevani Clinic System...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'DOCTOR') {
    return <Navigate to="/doctor" replace />;
  }

  return <Navigate to="/receptionist" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Smart Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* DOCTOR WORKSTATION ROUTES (Role: DOCTOR only) */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR']}>
                <DoctorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DoctorDashboard />} />
            
            {/* Phase 3: Patient Directory & Profile */}
            <Route path="patients" element={<PatientDirectory />} />
            <Route path="patients/:id" element={<PatientProfile />} />

            {/* Phase 4: Queue */}
            <Route
              path="queue"
              element={
                <PhasePlaceholder
                  title="Live Patient Queue & Calling"
                  phase="Phase 4 Module"
                  description="Real-time patient queue synchronized between Receptionist and Doctor computers via Socket.IO. Enables calling next patient, emergency priority toggles, and consultation timer."
                  features={[
                    'Real-time Socket.IO Queue Feed',
                    'One-click "Call Next Patient"',
                    'Emergency triage priority',
                    'Waiting time counter',
                  ]}
                  returnPath="/doctor"
                  returnLabel="Back to Doctor Dashboard"
                />
              }
            />

            {/* Phase 5: Consultation */}
            <Route
              path="consultation"
              element={
                <PhasePlaceholder
                  title="Doctor Consultation & Case Paper"
                  phase="Phase 5 Module"
                  description="Electronic Case Paper for New and Old patients: chief complaints, medical history, vitals, clinical examination, diagnosis, and treatment advice."
                  features={[
                    'New patient clinical assessment',
                    'Old patient previous history reference',
                    'Clinical vitals recording',
                    'Diagnosis & doctor advice notes',
                  ]}
                  returnPath="/doctor"
                  returnLabel="Back to Doctor Dashboard"
                />
              }
            />

            {/* Phase 5: Prescriptions */}
            <Route
              path="prescriptions"
              element={
                <PhasePlaceholder
                  title="Prescription Generator & PDF Printing"
                  phase="Phase 5 Module"
                  description="Digital prescription generation with medicine dosages, frequency (1-0-1), duration, instructions, and professional branded PDF printing."
                  features={[
                    'Structured medicine dosages and timing',
                    'Doctor instructions and advice',
                    'Finalized tamper-proof locking',
                    'Professional clinic print format',
                  ]}
                  returnPath="/doctor"
                  returnLabel="Back to Doctor Dashboard"
                />
              }
            />

            <Route path="diagnostics" element={<DiagnosticsView />} />
          </Route>

          {/* RECEPTIONIST WORKSTATION ROUTES (Role: RECEPTIONIST only) */}
          <Route
            path="/receptionist"
            element={
              <ProtectedRoute allowedRoles={['RECEPTIONIST']}>
                <ReceptionistLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ReceptionistDashboard />} />

            {/* Phase 3: Patient Management */}
            <Route path="patients/new" element={<NewPatientRegistration />} />
            <Route path="patients" element={<PatientDirectory />} />
            <Route path="patients/:id" element={<PatientProfile />} />

            {/* Phase 4: Queue */}
            <Route
              path="queue"
              element={
                <PhasePlaceholder
                  title="Front Desk Queue Monitor"
                  phase="Phase 4 Module"
                  description="Live queue monitor showing patients waiting, currently in consultation with Dr. Sharad Motugade, and completed visits."
                  features={[
                    'Real-time token status updates',
                    'Emergency priority tagging',
                    'Check-in and visit token dispatch',
                    'Doctor consultation status sync',
                  ]}
                  returnPath="/receptionist"
                  returnLabel="Back to Reception Dashboard"
                />
              }
            />

            {/* Phase 4: Appointments */}
            <Route
              path="appointments"
              element={
                <PhasePlaceholder
                  title="Appointment Management"
                  phase="Phase 4 Module"
                  description="Book advance appointments, manage slots, view daily calendar, and convert scheduled appointments into active visits upon arrival."
                  features={[
                    'Advance slot booking',
                    'One-click appointment-to-visit check-in',
                    'Duplicate visit prevention',
                    'Daily schedule view',
                  ]}
                  returnPath="/receptionist"
                  returnLabel="Back to Reception Dashboard"
                />
              }
            />

            {/* Phase 6: Billing */}
            <Route
              path="billing"
              element={
                <PhasePlaceholder
                  title="Billing & Payment Collections"
                  phase="Phase 6 Module"
                  description="Record consultation fees via Cash or UPI, issue payment receipts, track daily and monthly collections, and manage pending fees."
                  features={[
                    'Consultation fee recording',
                    'Cash and UPI payment modes',
                    'Unique receipt numbering',
                    'Daily cash collection reconciliation',
                  ]}
                  returnPath="/receptionist"
                  returnLabel="Back to Reception Dashboard"
                />
              }
            />

            <Route path="diagnostics" element={<DiagnosticsView />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

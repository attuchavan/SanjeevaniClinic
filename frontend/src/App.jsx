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

// Phase 4 Modules: Live Queue & Appointments
import DoctorQueuePage from './pages/doctor/DoctorQueuePage';
import ReceptionistQueuePage from './pages/receptionist/ReceptionistQueuePage';
import AppointmentsPage from './pages/receptionist/AppointmentsPage';

// Phase 5 Modules: Consultation & Prescriptions
import DoctorConsultationPage from './pages/doctor/DoctorConsultationPage';
import PrescriptionsArchivePage from './pages/doctor/PrescriptionsArchivePage';

// Phase 6 Module: Billing & Payment Collections
import BillingPage from './pages/receptionist/BillingPage';

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
            
            {/* Phase 4: Doctor Live Queue */}
            <Route path="queue" element={<DoctorQueuePage />} />

            {/* Phase 3: Patient Directory & Profile */}
            <Route path="patients" element={<PatientDirectory />} />
            <Route path="patients/:id" element={<PatientProfile />} />

            {/* Phase 5: Consultation */}
            <Route path="consultation" element={<DoctorConsultationPage />} />

            {/* Phase 5: Prescriptions */}
            <Route path="prescriptions" element={<PrescriptionsArchivePage />} />

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

            {/* Phase 4: Receptionist Queue & Appointments */}
            <Route path="queue" element={<ReceptionistQueuePage />} />
            <Route path="appointments" element={<AppointmentsPage />} />

            {/* Phase 3: Patient Management */}
            <Route path="patients/new" element={<NewPatientRegistration />} />
            <Route path="patients" element={<PatientDirectory />} />
            <Route path="patients/:id" element={<PatientProfile />} />

            {/* Phase 6: Billing & Collections */}
            <Route path="billing" element={<BillingPage />} />

            <Route path="diagnostics" element={<DiagnosticsView />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

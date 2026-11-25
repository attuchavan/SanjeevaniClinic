import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#102a43] animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Verifying clinic credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const targetDashboard = user.role === 'DOCTOR' ? '/doctor' : '/receptionist';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600">
            Your account ({user.fullName} &bull; <span className="font-semibold">{user.role}</span>) does not have authorization to view this section.
          </p>
          <div className="pt-2">
            <Link
              to={targetDashboard}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#102a43] text-white text-sm font-medium rounded-lg hover:bg-[#1d3557] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to {user.role === 'DOCTOR' ? 'Doctor' : 'Receptionist'} Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}


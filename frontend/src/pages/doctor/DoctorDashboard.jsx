import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Clock, 
  Stethoscope, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Search, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#102a43] to-[#1d3557] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-400/20 text-sky-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/30">
              Clinical Workspace
            </span>
            <span className="text-xs text-sky-200/80">&bull; {currentDate}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">
            Welcome back, {user?.fullName || 'Dr. Sharad Motugade'}
          </h2>
          <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
            You are logged in with DOCTOR clearance. Patient records, clinical case papers, and prescriptions are strictly protected on the local workstation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/doctor/queue"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-950/20"
          >
            <Clock className="w-4 h-4 text-slate-950" />
            <span>Open Patient Queue</span>
          </Link>
        </div>
      </div>

      {/* Clinical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Waiting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waiting in Queue</span>
            <div className="text-2xl font-bold text-[#102a43] mt-1">0</div>
            <span className="text-[11px] text-amber-600 font-medium">Ready for consultation</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* In Consultation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</span>
            <div className="text-2xl font-bold text-sky-600 mt-1">0</div>
            <span className="text-[11px] text-slate-500">Current active patient</span>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Today</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">0</div>
            <span className="text-[11px] text-emerald-600 font-medium">Consultations finished</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Prescriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prescriptions</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">0</div>
            <span className="text-[11px] text-slate-500">Generated & printed</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Patient Call Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Next Waiting Patient</span>
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
              Queue Standby
            </span>
          </div>

          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No patients waiting in queue</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Patients registered by the receptionist will appear here instantly via real-time Socket.IO.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              to="/doctor/queue"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
            >
              <span>View Full Queue Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security & Access Summary */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Role-Based Access Verification (Phase 2)</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-slate-700">
                <span className="font-semibold text-slate-900">Doctor Clearance Active:</span>
                <p className="text-slate-600 mt-0.5">
                  Authorized to access patient case sheets, diagnosis, medical examination notes, and finalize prescriptions.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div className="text-slate-700">
                <span className="font-semibold text-slate-900">Local Security Guardrails:</span>
                <p className="text-slate-600 mt-0.5">
                  Receptionist role is strictly prohibited from modifying finalized doctor prescriptions.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link
              to="/doctor/diagnostics"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#102a43] hover:text-sky-700 transition-colors"
            >
              <span>View LAN & Database Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


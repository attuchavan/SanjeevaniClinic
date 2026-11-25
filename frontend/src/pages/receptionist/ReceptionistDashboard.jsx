import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  ShieldCheck,
  Search
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const [currentDate] = useState(new Date().toLocaleDateString('en-IN', {
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
            <span className="bg-indigo-400/20 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
              Front Office Workspace
            </span>
            <span className="text-xs text-sky-200/80">&bull; {currentDate}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">
            Welcome, {user?.fullName || 'Reception Desk'}
          </h2>
          <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
            You are logged in with RECEPTIONIST clearance. You have full access to patient registrations, appointments, queue management, and consultation fee billing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/receptionist/patients/new"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>Register New Patient</span>
          </Link>
        </div>
      </div>

      {/* Front Office Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Patients</span>
            <div className="text-2xl font-bold text-[#102a43] mt-1">0</div>
            <span className="text-[11px] text-emerald-600 font-medium">Registered today</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        {/* Active Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Queue</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">0</div>
            <span className="text-[11px] text-slate-500">Waiting for doctor</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointments</span>
            <div className="text-2xl font-bold text-sky-600 mt-1">0</div>
            <span className="text-[11px] text-slate-500">Scheduled bookings</span>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Collections</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">₹0</div>
            <span className="text-[11px] text-slate-500">Cash & UPI</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Front Desk Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Actions Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span>Frequent Front Desk Tasks</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/receptionist/patients/new"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <UserPlus className="w-5 h-5 text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-slate-800">New Patient</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Issue new UHID & case paper</span>
              </div>
              <span className="text-[11px] font-semibold text-sky-600 mt-3 inline-flex items-center gap-1">
                <span>Register</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              to="/receptionist/patients"
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <Search className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-slate-800">Search Patients</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Find by mobile number or UHID</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 mt-3 inline-flex items-center gap-1">
                <span>Search</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>

        {/* Security & Role Boundaries */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Role Boundaries & Guardrails</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-slate-700">
                <span className="font-semibold text-slate-900">Reception Authority:</span>
                <p className="text-slate-600 mt-0.5">
                  Authorized to create walk-in visits, manage queue priority (normal/emergency), and record payments.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="text-slate-700">
                <span className="font-semibold text-slate-900">Protected Doctor Clearance:</span>
                <p className="text-slate-600 mt-0.5">
                  Doctor prescription writing and clinical diagnosis modifications are strictly protected from reception edits.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link
              to="/receptionist/diagnostics"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#102a43] hover:text-sky-700 transition-colors"
            >
              <span>View LAN Sync Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


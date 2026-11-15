import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import queueService from '../../services/queueService';
import appointmentService from '../../services/appointmentService';
import socket from '../../services/socket';
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
  Search,
  Flame
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const [queueSummary, setQueueSummary] = useState({ total: 0, waiting: 0, emergency: 0, completed: 0 });
  const [appointmentsCount, setAppointmentsCount] = useState(0);

  const [currentDate] = useState(new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }));

  const loadData = async () => {
    try {
      const qData = await queueService.getTodayQueue();
      setQueueSummary(qData.summary || { total: 0, waiting: 0, emergency: 0, completed: 0 });

      const todayStr = new Date().toISOString().split('T')[0];
      const apts = await appointmentService.getAppointments({ date: todayStr });
      setAppointmentsCount(apts.length);
    } catch (err) {
      console.error('Failed to load receptionist dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    socket.on('queue:update', handleUpdate);
    return () => {
      socket.off('queue:update', handleUpdate);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#102a43] to-[#1d3557] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-400/20 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
              SANJEEVANI CLINIC
            </span>
            <span className="text-xs text-sky-200/80">&bull; {currentDate}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">
            Welcome, {user?.fullName || 'Reception Desk'}
          </h2>
          <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
            Front Desk Operations &bull; Connected to Doctor Workstation over local network. Issue tokens, register patients, and schedule appointments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/receptionist/patients/new"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>Register New Patient</span>
          </Link>
        </div>
      </div>

      {/* Front Office Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today's Visits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Visits Today</span>
            <div className="text-2xl font-bold text-[#102a43] mt-1">{queueSummary.total}</div>
            <span className="text-[11px] text-slate-500 font-medium">Checked-in & walk-ins</span>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        {/* Active Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Queue</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{queueSummary.waiting}</div>
            <span className="text-[11px] text-amber-600 font-medium">Waiting outside</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointments Today</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{appointmentsCount}</div>
            <span className="text-[11px] text-slate-500">Scheduled bookings</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Emergency Priority */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emergency Triage</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{queueSummary.emergency}</div>
            <span className="text-[11px] text-rose-600 font-medium">High priority</span>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <Flame className="w-6 h-6" />
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
              to="/receptionist/queue"
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <Clock className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-slate-800">Queue Monitor</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Issue walk-in tokens & triage</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 mt-3 inline-flex items-center gap-1">
                <span>View Queue</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              to="/receptionist/appointments"
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <Calendar className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-slate-800">Appointments</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Book slots & check-in</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 mt-3 inline-flex items-center gap-1">
                <span>Manage Slots</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              to="/receptionist/billing"
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-all text-left flex flex-col justify-between group sm:col-span-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Billing & Collections</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Collect consultation fees & issue receipts</span>
                </div>
                <CreditCard className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-semibold text-teal-700 mt-2 inline-flex items-center gap-1">
                <span>Open Cash & UPI Desk</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>

        {/* Patient Directory Quick Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-600" />
            <span>Patient Search & Quick Lookup</span>
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            Search existing patients by mobile number or UHID to view past visit histories or create follow-up visit tokens.
          </p>

          <div className="pt-2">
            <Link
              to="/receptionist/patients"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
            >
              <Users className="w-4 h-4 text-sky-600" />
              <span>Search Patient Directory</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

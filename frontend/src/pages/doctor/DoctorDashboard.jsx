import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import queueService from '../../services/queueService';
import socket from '../../services/socket';
import { 
  Users, 
  Clock, 
  Stethoscope, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Search, 
  ShieldCheck,
  Flame,
  Bell
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [queueSummary, setQueueSummary] = useState({ waiting: 0, inProgress: 0, completed: 0, emergency: 0, total: 0 });
  const [currentPatient, setCurrentPatient] = useState(null);
  const [nextPatient, setNextPatient] = useState(null);

  const [currentDate] = useState(new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }));

  const loadDashboardData = async () => {
    try {
      const data = await queueService.getTodayQueue();
      setQueueSummary(data.summary || { waiting: 0, inProgress: 0, completed: 0, emergency: 0, total: 0 });
      setCurrentPatient(data.currentPatient || null);
      const nextWait = data.activeQueue?.find(v => v.id !== data.currentPatient?.id);
      setNextPatient(nextWait || null);
    } catch (err) {
      console.error('Failed to load dashboard queue data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
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
            <span className="bg-sky-400/20 text-sky-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/30">
              SANJEEVANI CLINIC
            </span>
            <span className="text-xs text-sky-200/80">&bull; {currentDate}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">
            Welcome back, {user?.fullName || 'Dr. Sharad Motugade'}
          </h2>
          <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
            Doctor Workstation &bull; Central Offline SQLite Host (Computer 1). Live patient queue is synchronized with the reception desk.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/doctor/queue"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-950/20"
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waiting Outside</span>
            <div className="text-2xl font-bold text-[#102a43] mt-1">{queueSummary.waiting}</div>
            <span className="text-[11px] text-amber-600 font-medium">Ready in lounge</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Emergency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emergency Priority</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{queueSummary.emergency}</div>
            <span className="text-[11px] text-rose-600 font-medium">Top of triage line</span>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Active Consultation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Patient</span>
            <div className="text-2xl font-bold text-sky-600 mt-1">{queueSummary.inProgress + (currentPatient ? 1 : 0)}</div>
            <span className="text-[11px] text-slate-500">In consultation room</span>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Today</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{queueSummary.completed}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Finished visits</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
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
              <span>Next In Queue</span>
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
              Queue Status
            </span>
          </div>

          {currentPatient ? (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-950">{currentPatient.full_name}</span>
                <span className="text-xs font-mono text-teal-700 ml-2">({currentPatient.uhid})</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Token #{currentPatient.token_number} &bull; {currentPatient.status}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to={`/doctor/consultation?visitId=${currentPatient.id}`}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Consult Now</span>
                </Link>
                <Link
                  to="/doctor/queue"
                  className="px-3 py-1.5 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg hover:bg-slate-300 transition"
                >
                  Queue
                </Link>
              </div>
            </div>
          ) : nextPatient ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-950">{nextPatient.full_name}</span>
                <span className="text-xs font-mono text-amber-700 ml-2">({nextPatient.uhid})</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Token #{nextPatient.token_number} &bull; Waiting Outside</p>
              </div>
              <Link
                to="/doctor/queue"
                className="px-3 py-1.5 bg-[#102a43] text-white text-xs font-bold rounded-lg"
              >
                Call Next
              </Link>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No patients waiting in queue</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Patients registered by the receptionist will appear here instantly via real-time Socket.IO.
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Link
              to="/doctor/queue"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
            >
              <span>Manage Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Directory & Shortcuts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-600" />
            <span>Quick Clinical Access</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/doctor/patients"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all text-left"
            >
              <Users className="w-5 h-5 text-sky-600 mb-2" />
              <span className="block text-xs font-bold text-slate-800">Patient Directory</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Lookup past medical histories</span>
            </Link>

            <Link
              to="/doctor/diagnostics"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all text-left"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
              <span className="block text-xs font-bold text-slate-800">System Diagnostics</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Verify LAN sync & SQLite</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

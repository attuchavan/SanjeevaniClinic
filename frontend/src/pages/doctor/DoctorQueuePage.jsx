import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import queueService from '../../services/queueService';
import socket from '../../services/socket';
import { 
  Clock, 
  Stethoscope, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  ShieldAlert, 
  Loader2, 
  RefreshCw, 
  Radio, 
  ChevronRight,
  ExternalLink,
  Flame,
  XCircle,
  FileText
} from 'lucide-react';

export default function DoctorQueuePage() {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [error, setError] = useState('');
  const [callNotice, setCallNotice] = useState('');

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await queueService.getTodayQueue();
      setQueueData(data);
    } catch (err) {
      console.error('Failed to load queue:', err);
      setError('Could not retrieve live queue from local server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();

    // Listen to real-time queue updates from Receptionist or Doctor actions
    const handleQueueUpdate = () => {
      // Re-fetch queue silently
      queueService.getTodayQueue().then(setQueueData).catch(console.error);
    };

    socket.on('queue:update', handleQueueUpdate);
    return () => {
      socket.off('queue:update', handleQueueUpdate);
    };
  }, []);

  const handleCallNext = async () => {
    try {
      setCallingNext(true);
      setError('');
      setCallNotice('');
      const called = await queueService.callNextPatient();
      setCallNotice(`Token #${called.token_number} (${called.full_name}) called!`);
      await loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No patients available to call');
    } finally {
      setCallingNext(false);
    }
  };

  const handleStatusChange = async (visitId, newStatus) => {
    try {
      await queueService.updateVisitStatus(visitId, { status: newStatus });
      await loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Status update failed');
    }
  };

  const handleTogglePriority = async (visitId, currentPriority) => {
    const nextPriority = currentPriority === 'EMERGENCY' ? 'NORMAL' : 'EMERGENCY';
    try {
      await queueService.updateVisitStatus(visitId, { priority: nextPriority });
      await loadQueue();
    } catch (err) {
      setError('Failed to toggle priority');
    }
  };

  const currentPatient = queueData?.currentPatient;
  const activeQueue = queueData?.activeQueue?.filter(v => v.id !== currentPatient?.id) || [];
  const completedQueue = queueData?.completedQueue || [];
  const summary = queueData?.summary || { total: 0, waiting: 0, emergency: 0, completed: 0 };

  return (
    <div className="space-y-6">
      {/* Top Bar with Call Next Primary Button */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Live Consultation Queue
            </span>
            <span className="text-xs text-slate-500 font-medium">
              &bull; {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#102a43] mt-1">
            Doctor Patient Queue & Calling Station
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emergency patients automatically sorted to the front of the queue.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadQueue}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Primary Call Next Button */}
          <button
            onClick={handleCallNext}
            disabled={callingNext || summary.waiting === 0}
            className="px-6 py-3 bg-[#102a43] hover:bg-[#1d3557] text-white text-sm font-bold rounded-xl shadow-md shadow-navy-900/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {callingNext ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                <span>Calling Patient...</span>
              </>
            ) : (
              <>
                <Bell className="w-5 h-5 text-sky-400 animate-bounce" />
                <span>CALL NEXT PATIENT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications / Errors */}
      {callNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{callNotice}</span>
          </div>
          <button onClick={() => setCallNotice('')} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting Outside</span>
          <div className="text-2xl font-bold text-[#102a43] mt-0.5">{summary.waiting}</div>
          <span className="text-[10px] text-amber-600 font-medium">Ready in lobby</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emergency Priority</span>
          <div className="text-2xl font-bold text-rose-600 mt-0.5">{summary.emergency}</div>
          <span className="text-[10px] text-rose-600 font-medium">Urgent attention</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultation Active</span>
          <div className="text-2xl font-bold text-sky-600 mt-0.5">{summary.inProgress + summary.called}</div>
          <span className="text-[10px] text-sky-600 font-medium">Inside doctor room</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Today</span>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{summary.completed}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Finished consultations</span>
        </div>
      </div>

      {/* CURRENTLY CALLED / IN PROGRESS PATIENT HERO CARD */}
      {currentPatient ? (
        <div className="bg-gradient-to-r from-sky-900 to-[#102a43] text-white rounded-2xl p-6 shadow-md border border-sky-800 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-sky-800/80">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                currentPatient.status === 'IN_PROGRESS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                {currentPatient.status === 'IN_PROGRESS' ? 'Consultation in Progress' : 'Currently Called'}
              </span>
              <span className="text-xs text-sky-200/80">
                &bull; Called at {currentPatient.called_at ? new Date(currentPatient.called_at).toLocaleTimeString() : 'Just now'}
              </span>
            </div>

            <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-lg">
              Token #{currentPatient.token_number}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">{currentPatient.full_name}</span>
                <span className="text-xs font-mono text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  {currentPatient.uhid}
                </span>
              </div>
              <div className="text-xs text-sky-200/80 mt-1 flex items-center space-x-3">
                <span>Age: <strong>{currentPatient.age ? `${currentPatient.age} yrs` : '—'}</strong></span>
                <span>Gender: <strong>{currentPatient.gender}</strong></span>
                <span>Mobile: <strong className="font-mono">{currentPatient.mobile_number}</strong></span>
                <span>Blood: <strong>{currentPatient.blood_group}</strong></span>
              </div>

              {currentPatient.allergies && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-400/40 text-rose-200 rounded-lg text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>Known Allergies: {currentPatient.allergies}</span>
                </div>
              )}
            </div>

            {/* Consultation Action Buttons */}
            <div className="flex items-center space-x-2 flex-wrap">
              {currentPatient.status === 'CALLED' && (
                <button
                  onClick={() => handleStatusChange(currentPatient.id, 'IN_PROGRESS')}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20 flex items-center gap-1.5"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Start Consultation</span>
                </button>
              )}

              <Link
                to={`/doctor/patients/${currentPatient.patient_id}`}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all border border-white/20 flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Patient History</span>
              </Link>

              <button
                onClick={() => handleStatusChange(currentPatient.id, 'COMPLETED')}
                className="px-4 py-2.5 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Complete</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-300 text-center space-y-2">
          <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Doctor Consultation Room is Ready</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {summary.waiting > 0
              ? `There are ${summary.waiting} patient(s) waiting outside. Click "CALL NEXT PATIENT" to invite the next token.`
              : 'The queue is currently empty. Receptionist registrations will appear here in real time.'}
          </p>
        </div>
      )}

      {/* WAITING PATIENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Waiting Patients Queue</span>
            </h3>
            <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
              {activeQueue.length} Waiting
            </span>
          </div>
        </div>

        {activeQueue.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No patients currently waiting in queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 sm:px-6">Token</th>
                  <th className="py-3 px-4">Patient UHID & Name</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Visit Type</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {activeQueue.map((v) => (
                  <tr key={v.id} className="hover:bg-sky-50/40 transition-colors">
                    {/* Token */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-xs">
                        #{v.token_number}
                      </span>
                    </td>

                    {/* Patient Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{v.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {v.uhid} &bull; {v.age} yrs &bull; {v.gender}
                      </div>
                      {v.allergies && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-semibold mt-0.5">
                          <ShieldAlert className="w-3 h-3 text-rose-500" />
                          <span>Allergies: {v.allergies}</span>
                        </span>
                      )}
                    </td>

                    {/* Priority Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePriority(v.id, v.priority)}
                        title="Click to toggle Emergency priority"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          v.priority === 'EMERGENCY'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {v.priority === 'EMERGENCY' && <Flame className="w-3 h-3 text-rose-600" />}
                        <span>{v.priority}</span>
                      </button>
                    </td>

                    {/* Visit Type */}
                    <td className="py-3.5 px-4 font-semibold text-[11px]">
                      <span className={v.visit_type === 'NEW' ? 'text-sky-700' : 'text-indigo-700'}>
                        {v.visit_type}
                      </span>
                    </td>

                    {/* Check-in Time */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {v.visit_time}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right space-x-2">
                      <button
                        onClick={() => handleStatusChange(v.id, 'CALLED')}
                        className="px-3 py-1.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Call
                      </button>
                      <button
                        onClick={() => handleStatusChange(v.id, 'CANCELLED')}
                        title="Cancel Token"
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completed Consultations Summary */}
      {completedQueue.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Finished Consultations Today ({completedQueue.length})</span>
            </h4>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {completedQueue.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between text-slate-600">
                <div>
                  <span className="font-mono font-bold text-slate-800 mr-2">Token #{c.token_number}</span>
                  <span className="font-medium text-slate-900">{c.full_name}</span>
                  <span className="font-mono text-slate-400 text-[11px] ml-2">({c.uhid})</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-slate-400">
                    Finished: {c.completed_at ? new Date(c.completed_at).toLocaleTimeString() : 'Done'}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                    Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

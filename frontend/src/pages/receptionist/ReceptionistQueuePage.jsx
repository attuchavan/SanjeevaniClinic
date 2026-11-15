import React, { useState, useEffect } from 'react';
import queueService from '../../services/queueService';
import patientService from '../../services/patientService';
import socket from '../../services/socket';
import billingService from '../../services/billingService';
import PaymentModal from '../../components/billing/PaymentModal';
import PrintableReceiptModal from '../../components/billing/PrintableReceiptModal';
import { 
  Clock, 
  UserPlus, 
  Search, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  RefreshCw, 
  Radio, 
  XCircle,
  Building2,
  Receipt
} from 'lucide-react';

export default function ReceptionistQueuePage() {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Walk-In Token Modal
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitType, setVisitType] = useState('NEW');
  const [priority, setPriority] = useState('NORMAL');
  const [issuingToken, setIssuingToken] = useState(false);
  const [modalError, setModalError] = useState('');
  const [issuedNotice, setIssuedNotice] = useState('');

  // Payment state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentVisit, setSelectedPaymentVisit] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await queueService.getTodayQueue();
      setQueueData(data);
    } catch (err) {
      console.error('Failed to load queue:', err);
      setError('Could not retrieve live queue from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();

    const handleQueueUpdate = () => {
      queueService.getTodayQueue().then(setQueueData).catch(console.error);
    };

    socket.on('queue:update', handleQueueUpdate);
    return () => {
      socket.off('queue:update', handleQueueUpdate);
    };
  }, []);

  // Search patients for walk-in modal
  useEffect(() => {
    if (patientSearch.trim().length >= 2) {
      patientService.searchPatients(patientSearch, 1, 5)
        .then(res => setSearchResults(res.patients || []))
        .catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [patientSearch]);

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!selectedPatient) {
      setModalError('Please select a registered patient.');
      return;
    }

    try {
      setIssuingToken(true);
      const newVisit = await queueService.createVisit({
        patientId: selectedPatient.id,
        visitType,
        priority,
      });

      setIssuedNotice(`Token #${newVisit.token_number} assigned to ${selectedPatient.full_name}!`);
      setWalkInModalOpen(false);
      setSelectedPatient(null);
      setPatientSearch('');
      await loadQueue();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to issue token');
    } finally {
      setIssuingToken(false);
    }
  };

  const handleTogglePriority = async (visitId, currentPriority) => {
    const next = currentPriority === 'EMERGENCY' ? 'NORMAL' : 'EMERGENCY';
    try {
      await queueService.updateVisitStatus(visitId, { priority: next });
      await loadQueue();
    } catch (err) {
      console.error('Toggle priority failed:', err);
    }
  };

  const handleCancelVisit = async (visitId) => {
    if (!window.confirm('Are you sure you want to cancel this patient queue token?')) return;
    try {
      await queueService.updateVisitStatus(visitId, { status: 'CANCELLED' });
      await loadQueue();
    } catch (err) {
      console.error('Cancel visit failed:', err);
    }
  };

  const currentPatient = queueData?.currentPatient;
  const activeQueue = queueData?.activeQueue || [];
  const summary = queueData?.summary || { total: 0, waiting: 0, emergency: 0, completed: 0, called: 0, inProgress: 0 };

  return (
    <div className="space-y-6">
      {/* Top Bar with Issue Walk-In Token Button */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Reception Queue Station
            </span>
            <span className="text-xs text-slate-500 font-medium">
              &bull; Live Sync to Doctor Workstation
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#102a43] mt-1">
            Patient Queue Monitor & Token Dispatch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue queue tokens, monitor waiting patients, and manage emergency triage priority.
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

          <button
            onClick={() => setWalkInModalOpen(true)}
            className="px-5 py-2.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4 text-sky-400" />
            <span>Issue Walk-in Token</span>
          </button>
        </div>
      </div>

      {issuedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{issuedNotice}</span>
          </div>
          <button onClick={() => setIssuedNotice('')} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting Patients</span>
          <div className="text-2xl font-bold text-[#102a43] mt-0.5">{summary.waiting}</div>
          <span className="text-[10px] text-amber-600 font-medium">In waiting lounge</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emergency Priority</span>
          <div className="text-2xl font-bold text-rose-600 mt-0.5">{summary.emergency}</div>
          <span className="text-[10px] text-rose-600 font-medium">Front of line</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Doctor Room</span>
          <div className="text-2xl font-bold text-sky-600 mt-0.5">{summary.called + summary.inProgress}</div>
          <span className="text-[10px] text-sky-600 font-medium">Dr. Sharad Motugade</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Visits</span>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{summary.completed}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Departed</span>
        </div>
      </div>

      {/* Currently In with Doctor Banner */}
      {currentPatient && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
              #{currentPatient.token_number}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">{currentPatient.full_name}</span>
                <span className="text-xs font-mono text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                  {currentPatient.uhid}
                </span>
                <span className="bg-sky-200 text-sky-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {currentPatient.status === 'IN_PROGRESS' ? 'Consulting with Doctor' : 'Called by Doctor'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Called at {currentPatient.called_at ? new Date(currentPatient.called_at).toLocaleTimeString() : 'Just now'} &bull; {currentPatient.age} yrs &bull; {currentPatient.gender}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-sm text-[#102a43] flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Active Queue List</span>
            </h3>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
              {activeQueue.length} Active Tokens
            </span>
          </div>
        </div>

        {activeQueue.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No active queue visits yet today. Click "Issue Walk-in Token" or check in an appointment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 sm:px-6">Token</th>
                  <th className="py-3 px-4">Patient UHID & Name</th>
                  <th className="py-3 px-4">Priority (Triage)</th>
                  <th className="py-3 px-4">Visit Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {activeQueue.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Token */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg text-xs">
                        #{v.token_number}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{v.full_name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {v.uhid} &bull; {v.mobile_number}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePriority(v.id, v.priority)}
                        title="Click to toggle emergency priority"
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

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        v.status === 'WAITING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : v.status === 'CALLED'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {v.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {v.visit_time}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedPaymentVisit({
                            id: v.id,
                            patientId: v.patient_id,
                            patientName: v.full_name,
                            uhid: v.uhid,
                            tokenNumber: v.token_number,
                            visitNumber: v.visit_number,
                            visitType: v.visit_type,
                          });
                          setPaymentModalOpen(true);
                        }}
                        className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold px-2.5 py-1.5 rounded-lg border border-teal-200 inline-flex items-center gap-1 transition"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Collect Fee</span>
                      </button>
                      <button
                        onClick={() => handleCancelVisit(v.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WALK-IN TOKEN MODAL */}
      {walkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#102a43] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm">Issue Walk-in Queue Token</h3>
              </div>
              <button
                onClick={() => {
                  setWalkInModalOpen(false);
                  setSelectedPatient(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {modalError}
                </div>
              )}

              {/* Patient Search & Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Search Registered Patient <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search by name, UHID, or mobile number..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && !selectedPatient && (
                  <div className="mt-1 border border-slate-200 bg-white rounded-xl shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch(p.full_name);
                          setSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-sky-50 cursor-pointer text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{p.full_name}</span>
                          <span className="font-mono text-slate-500 text-[11px] ml-2">({p.uhid})</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-600">{p.mobile_number}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Patient Confirmation Box */}
                {selectedPatient && (
                  <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-sky-950">{selectedPatient.full_name}</span>
                      <span className="font-mono text-sky-700 ml-2">({selectedPatient.uhid})</span>
                      <span className="text-slate-500 ml-2">&bull; {selectedPatient.mobile_number}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Visit Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['NEW', 'FOLLOW_UP'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setVisitType(t)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        visitType === t
                          ? 'bg-[#102a43] text-white border-[#102a43]'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {t === 'NEW' ? 'New Patient Visit' : 'Follow-up Visit'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Queue Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('NORMAL')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      priority === 'NORMAL'
                        ? 'bg-[#102a43] text-white border-[#102a43]'
                        : 'bg-slate-50 text-slate-600 border-slate-300'
                    }`}
                  >
                    Normal Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('EMERGENCY')}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                      priority === 'EMERGENCY'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-rose-700 border-slate-300'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Emergency Priority</span>
                  </button>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWalkInModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuingToken || !selectedPatient}
                  className="px-5 py-2 bg-[#102a43] hover:bg-[#1d3557] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {issuingToken && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Assign Token</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Entry Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        visit={selectedPaymentVisit}
        onSuccess={async (createdPayment) => {
          setPaymentModalOpen(false);
          await loadQueue();
          try {
            const printData = await billingService.getPrintableReceipt(createdPayment.id);
            setSelectedReceipt(printData.data);
            setReceiptModalOpen(true);
          } catch (e) {
            // fallback
          }
        }}
      />

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={selectedReceipt}
      />
    </div>
  );
}


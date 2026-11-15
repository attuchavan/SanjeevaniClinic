import React, { useState, useEffect } from 'react';
import appointmentService from '../../services/appointmentService';
import patientService from '../../services/patientService';
import socket from '../../services/socket';
import { 
  Calendar, 
  Clock, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  RefreshCw, 
  UserCheck, 
  XCircle,
  CalendarCheck
} from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');

  // Booking Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [aptDate, setAptDate] = useState(new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('11:00');
  const [aptType, setAptType] = useState('NEW');
  const [aptNotes, setAptNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [modalError, setModalError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await appointmentService.getAppointments({
        date: filterDate || undefined,
        status: filterStatus || undefined,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Could not retrieve appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();

    const handleUpdate = () => {
      loadAppointments();
    };

    socket.on('queue:update', handleUpdate);
    return () => {
      socket.off('queue:update', handleUpdate);
    };
  }, [filterDate, filterStatus]);

  // Search patients for booking modal
  useEffect(() => {
    if (patientSearch.trim().length >= 2) {
      patientService.searchPatients(patientSearch, 1, 5)
        .then(res => setSearchResults(res.patients || []))
        .catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [patientSearch]);

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!selectedPatient) {
      setModalError('Please select a registered patient.');
      return;
    }

    try {
      setBooking(true);
      const newApt = await appointmentService.bookAppointment({
        patientId: selectedPatient.id,
        appointmentDate: aptDate,
        appointmentTime: aptTime,
        type: aptType,
        notes: aptNotes.trim() || null,
      });

      setActionNotice(`Appointment #${newApt.appointment_number} booked for ${selectedPatient.full_name}!`);
      setBookModalOpen(false);
      setSelectedPatient(null);
      setPatientSearch('');
      setAptNotes('');
      await loadAppointments();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const handleCheckIn = async (appointmentId, patientName) => {
    try {
      setError('');
      const visit = await appointmentService.checkInAppointment(appointmentId, 'NORMAL');
      setActionNotice(`Patient ${patientName} checked in! Assigned Queue Token #${visit.token_number}.`);
      await loadAppointments();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Check-in failed');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    const reason = window.prompt('Please enter cancellation reason:');
    if (reason === null) return;

    try {
      await appointmentService.cancelAppointment(appointmentId, reason);
      setActionNotice('Appointment marked as CANCELLED.');
      await loadAppointments();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cancellation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Scheduling & Appointments
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#102a43] mt-1">
            Doctor Appointment Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Book slots, check-in arriving patients, and avoid duplicate visit generation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadAppointments}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setBookModalOpen(true)}
            className="px-5 py-2.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice('')} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date & Status Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Filter Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
            className="text-[11px] text-sky-700 hover:underline font-semibold"
          >
            Today
          </button>
          <button
            onClick={() => setFilterDate('')}
            className="text-[11px] text-slate-500 hover:underline ml-1"
          >
            All Dates
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#102a43] animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No appointments found</p>
            <p className="text-[11px]">Click "Book Appointment" to add a new slot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 sm:px-6">Appt #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient UHID & Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Type & Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                      {apt.appointment_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{apt.appointment_date}</div>
                      <div className="text-[11px] font-mono text-slate-500">{apt.appointment_time}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{apt.full_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{apt.uhid} &bull; {apt.age} yrs</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {apt.mobile_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[11px] text-sky-700 block">{apt.type}</span>
                      {apt.notes && <span className="text-[11px] text-slate-500 block truncate max-w-xs">{apt.notes}</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        apt.status === 'SCHEDULED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : apt.status === 'CHECKED_IN'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : apt.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {apt.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right space-x-2">
                      {apt.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => handleCheckIn(apt.id, apt.full_name)}
                            className="px-3 py-1.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                            <span>Check-In (Token)</span>
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Cancel Appointment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOOK APPOINTMENT MODAL */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#102a43] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm">Book Doctor Appointment</h3>
              </div>
              <button
                onClick={() => {
                  setBookModalOpen(false);
                  setSelectedPatient(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {modalError}
                </div>
              )}

              {/* Patient Search */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Patient <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patient name, UHID, or mobile..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {searchResults.length > 0 && !selectedPatient && (
                  <div className="mt-1 border border-slate-200 bg-white rounded-xl shadow-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
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
                        <span className="font-bold text-slate-800">{p.full_name} ({p.uhid})</span>
                        <span className="font-mono text-slate-500 text-[11px]">{p.mobile_number}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPatient && (
                  <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-sky-950">{selectedPatient.full_name}</span>
                      <span className="font-mono text-sky-700 ml-2">({selectedPatient.uhid})</span>
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

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {[
                      '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
                      '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
                    ].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['NEW', 'FOLLOW_UP', 'ROUTINE'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAptType(t)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        aptType === t
                          ? 'bg-[#102a43] text-white border-[#102a43]'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Concern / Notes</label>
                <textarea
                  rows={2}
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                  placeholder="e.g. Fever for 3 days, follow-up blood pressure check"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking || !selectedPatient}
                  className="px-5 py-2 bg-[#102a43] hover:bg-[#1d3557] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {booking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

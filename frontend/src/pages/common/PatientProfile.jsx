import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { 
  User, 
  ArrowLeft, 
  Phone, 
  Calendar, 
  Heart, 
  ShieldAlert, 
  MapPin, 
  Edit3, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Loader2, 
  AlertCircle,
  X,
  Building2,
  Stethoscope
} from 'lucide-react';

export default function PatientProfile() {
  const { id } = useParams();
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Demographics Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    mobileNumber: '',
    age: '',
    gender: 'MALE',
    address: '',
    bloodGroup: 'UNKNOWN',
    allergies: '',
    emergencyContact: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const isReceptionist = user?.role === 'RECEPTIONIST';
  const backDirectoryPath = isReceptionist ? '/receptionist/patients' : '/doctor/patients';

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await patientService.getPatientById(id);
      setPatient(data);
      setEditForm({
        fullName: data.full_name || '',
        mobileNumber: data.mobile_number || '',
        age: data.age || '',
        gender: data.gender || 'MALE',
        address: data.address || '',
        bloodGroup: data.blood_group || 'UNKNOWN',
        allergies: data.allergies || '',
        emergencyContact: data.emergency_contact || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Patient record not found or could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    try {
      setSavingEdit(true);
      const updated = await patientService.updatePatient(id, {
        fullName: editForm.fullName.trim(),
        mobileNumber: editForm.mobileNumber.trim(),
        gender: editForm.gender,
        age: editForm.age ? Number(editForm.age) : null,
        address: editForm.address.trim() || null,
        bloodGroup: editForm.bloodGroup,
        allergies: editForm.allergies.trim() || null,
        emergencyContact: editForm.emergencyContact.trim() || null,
      });

      setPatient(updated);
      setEditModalOpen(false);
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update demographics');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-[#102a43] animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Fetching permanent patient record...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-12 text-center space-y-4 bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Record Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'Patient profile does not exist.'}</p>
        <div className="pt-2">
          <Link
            to={backDirectoryPath}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#102a43] text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to={backDirectoryPath}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Patient File &bull; Permanent Medical Record</span>
            </div>
            <h1 className="text-xl font-bold text-[#102a43] flex items-center gap-2">
              <span>{patient.full_name}</span>
            </h1>
          </div>
        </div>

        <button
          onClick={() => setEditModalOpen(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Demographics</span>
        </button>
      </div>

      {/* Critical Medical Allergies Alert Banner (if present) */}
      {patient.allergies ? (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              High Priority Medical Alert &bull; Known Patient Allergies
            </h3>
            <p className="text-sm font-semibold text-rose-800 mt-0.5">
              {patient.allergies}
            </p>
            <p className="text-[11px] text-rose-600 mt-1">
              Check all drug classes carefully before prescribing or dispensing medicines.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>No known drug allergies reported at registration.</span>
        </div>
      )}

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Identification & Demographics */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              <span>Identity & Registration</span>
            </h3>
            <span className="font-mono text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
              {patient.uhid}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Full Name:</span>
              <span className="font-bold text-slate-900">{patient.full_name}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Gender & Age:</span>
              <span className="font-medium text-slate-800">
                {patient.gender} &bull; {patient.age ? `${patient.age} years` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Date of Birth:</span>
              <span className="font-medium text-slate-800">{patient.dob || '—'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Registration Date:</span>
              <span className="font-medium text-slate-800">
                {new Date(patient.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Contact & Emergency */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Contact & Address</span>
            </h3>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium">
              Primary Contact
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Mobile Number:</span>
              <span className="font-mono font-bold text-slate-900">{patient.mobile_number}</span>
            </div>
            <div className="py-1 text-slate-600">
              <span className="text-slate-400 block mb-0.5">Emergency Contact:</span>
              <span className="font-medium text-slate-800 block">
                {patient.emergency_contact || 'None registered'}
              </span>
            </div>
            <div className="py-1 text-slate-600">
              <span className="text-slate-400 block mb-0.5">Address:</span>
              <span className="font-medium text-slate-800 block leading-relaxed">
                {patient.address || 'No address registered'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Clinical & Blood Group */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Clinical Indicators</span>
            </h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              Blood: {patient.blood_group || 'Unknown'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Lifetime Visits:</span>
              <span className="font-bold text-slate-900">{patient.totalVisits || 0}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-400">Last Consultation:</span>
              <span className="font-medium text-slate-800">
                {patient.visits?.[0]?.visit_date || 'None yet'}
              </span>
            </div>
            <div className="py-1 text-slate-600">
              <span className="text-slate-400 block mb-0.5">Allergies:</span>
              <span className="font-semibold text-rose-700 block">
                {patient.allergies || 'No known drug allergies'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Consultation & Visit Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#102a43] flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <span>Consultation History & Lifetime Visit Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable chronological record of visits, clinical case papers, and prescriptions.
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {patient.visits?.length || 0} Visit Records
          </span>
        </div>

        {patient.visits && patient.visits.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {patient.visits.map((v) => (
              <div key={v.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-[#102a43]">
                      Visit #{v.visit_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.visit_type === 'NEW' 
                        ? 'bg-sky-100 text-sky-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {v.visit_type} PATIENT
                    </span>
                    <span className="text-xs text-slate-400">&bull; Token {v.token_number}</span>
                    {v.priority === 'EMERGENCY' && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        EMERGENCY
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center space-x-3">
                    <span>Date: <strong className="text-slate-800">{v.visit_date}</strong> at {v.visit_time}</span>
                    {v.diagnosis && <span>Diagnosis: <strong className="text-slate-800">{v.diagnosis}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    v.status === 'COMPLETED' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No previous visits recorded</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              This patient has not attended any consultations yet. Visits generated in Phase 4 (Live Queue) and Phase 5 (Consultations) will be linked here automatically.
            </p>
          </div>
        )}
      </div>

      {/* Edit Demographics Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#102a43] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm">Edit Patient Demographics</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editForm.mobileNumber}
                    onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="125"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-rose-700 mb-1">Allergies (Highlighted)</label>
                  <input
                    type="text"
                    value={editForm.allergies}
                    onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Sulfa"
                    className="w-full px-3 py-2 border border-rose-200 bg-rose-50/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    placeholder="Name and phone"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-[#102a43] hover:bg-[#1d3557] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

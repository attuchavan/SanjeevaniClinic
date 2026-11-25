import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import patientService from '../../services/patientService';
import { 
  UserPlus, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  Search, 
  Phone, 
  User, 
  Calendar, 
  Heart, 
  ShieldAlert, 
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function NewPatientRegistration() {
  const navigate = useNavigate();

  // Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [gender, setGender] = useState('MALE');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('UNKNOWN');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState(null);

  // Real-time duplicate check when mobile number reaches 10 digits
  useEffect(() => {
    const cleanMobile = mobileNumber.trim();
    if (cleanMobile.length === 10) {
      setCheckingDuplicates(true);
      patientService.checkDuplicateMobile(cleanMobile)
        .then((res) => {
          if (res?.duplicates?.length > 0) {
            setDuplicates(res.duplicates);
          } else {
            setDuplicates([]);
          }
        })
        .catch(() => setDuplicates([]))
        .finally(() => setCheckingDuplicates(false));
    } else {
      setDuplicates([]);
    }
  }, [mobileNumber]);

  // Handle Age change -> sync estimated DOB
  const handleAgeChange = (val) => {
    setAge(val);
    if (val && !isNaN(val) && Number(val) >= 0) {
      const estimatedYear = new Date().getFullYear() - Number(val);
      setDob(`${estimatedYear}-01-01`);
    }
  };

  // Handle DOB change -> sync exact Age
  const handleDobChange = (val) => {
    setDob(val);
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(Math.max(0, calculatedAge));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Please enter the patient full name.');
      return;
    }

    if (!mobileNumber.trim() || mobileNumber.trim().length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!age && !dob) {
      setFormError('Please provide either patient age or date of birth.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        gender,
        age: age ? Number(age) : null,
        dob: dob || null,
        bloodGroup,
        allergies: allergies.trim() || null,
        emergencyContact: emergencyContact.trim() || null,
        address: address.trim() || null,
      };

      const newPatient = await patientService.createPatient(payload);
      setRegisteredPatient(newPatient);
    } catch (err) {
      console.error('Registration failed:', err);
      setFormError(
        err.response?.data?.message || 
        err.response?.data?.errors?.[0]?.message || 
        err.message || 
        'Failed to register patient'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFullName('');
    setMobileNumber('');
    setGender('MALE');
    setAge('');
    setDob('');
    setBloodGroup('UNKNOWN');
    setAllergies('');
    setEmergencyContact('');
    setAddress('');
    setFormError('');
    setDuplicates([]);
    setRegisteredPatient(null);
  };

  // Render Registration Success Screen
  if (registeredPatient) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-md text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Registration Successful
          </span>
          <h2 className="text-2xl font-bold text-[#102a43] mt-2">
            {registeredPatient.full_name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Permanent Patient Record has been created in Sanjeevani Clinic database.
          </p>
        </div>

        {/* Generated UHID Badge */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Assigned Unique Patient ID (UHID)
          </span>
          <span className="text-3xl font-mono font-extrabold text-[#102a43] block mt-1 tracking-wider">
            {registeredPatient.uhid}
          </span>
          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-xs text-slate-600">
            <span>Mobile: <strong className="text-slate-800 font-mono">{registeredPatient.mobile_number}</strong></span>
            <span>Age/Gender: <strong className="text-slate-800">{registeredPatient.age} yrs &bull; {registeredPatient.gender}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to={`/receptionist/patients/${registeredPatient.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <span>View Complete Profile & History</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-300"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Another Patient</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            to="/receptionist"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#102a43] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-600" />
              <span>New Patient Registration</span>
            </h1>
            <p className="text-xs text-slate-500">
              Sanjeevani Clinic &bull; Dr. Sharad Motugade &bull; Generates Permanent UHID
            </p>
          </div>
        </div>

        <Link
          to="/receptionist/patients"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Existing Directory</span>
        </Link>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {/* Duplicate Patient Warning Banner */}
        {duplicates.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Duplicate Alert: Found {duplicates.length} existing patient(s) with mobile {mobileNumber}</span>
            </div>
            <p className="text-[11px] text-amber-800">
              A patient is already registered with this mobile number. Please confirm if this is a follow-up visit before creating a new duplicate profile.
            </p>
            <div className="divide-y divide-amber-200/60 pt-1">
              {duplicates.map((dup) => (
                <div key={dup.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{dup.full_name}</span>
                    <span className="font-mono text-slate-600 ml-2">({dup.uhid})</span>
                    <span className="text-slate-500 ml-2">&bull; {dup.age} yrs &bull; {dup.gender}</span>
                  </div>
                  <Link
                    to={`/receptionist/patients/${dup.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline"
                  >
                    <span>Open Existing Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Demographics */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-sky-600" />
            <span>Patient Identification & Demographics</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Narayan Kulkarni"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Mobile Number (10 Digits) <span className="text-rose-500">*</span></span>
                {checkingDuplicates && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9822001122"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      gender === g
                        ? 'bg-[#102a43] text-white border-[#102a43]'
                        : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age (in Years) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="125"
                value={age}
                onChange={(e) => handleAgeChange(e.target.value)}
                placeholder="e.g. 38"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth (Optional or Auto-Estimated)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Alerts & Vitals Pre-requisites */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Clinical Indicators & Medical Alerts</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                <option value="UNKNOWN">Unknown / Not Tested</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
              </select>
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact (Name & Phone)
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Sangeeta (Wife) - 9822003344"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            {/* Known Allergies */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-rose-700 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Known Drug Allergies / Sensitivities (Prominently Highlighted to Doctor)</span>
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa drugs, Aspirin, Pollen (Leave blank if none)"
                className="w-full px-3.5 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-900 placeholder-rose-300"
              />
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Residential Address / City</span>
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House No. 42, Near Ganpati Temple, Market Yard, Sangli"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <Link
            to="/receptionist"
            className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-bold rounded-xl shadow-md shadow-navy-900/10 transition-colors inline-flex items-center space-x-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating UHID...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-sky-400" />
                <span>Register & Assign UHID</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

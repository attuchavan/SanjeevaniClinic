import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  FileText,
  Pill,
  Save,
  CheckCircle2,
  Printer,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Copy,
  ArrowLeft,
  HeartPulse,
  Info,
} from 'lucide-react';
import consultationService from '../../services/consultationService';
import queueService from '../../services/queueService';
import PrintablePrescriptionModal from '../../components/consultation/PrintablePrescriptionModal';
import PrintableCasePaperModal from '../../components/consultation/PrintableCasePaperModal';

// Fast common complaint suggestions
const COMMON_COMPLAINTS = [
  'Fever',
  'Dry cough',
  'Productive cough',
  'Headache',
  'Generalized bodyache',
  'Sore throat',
  'Acidity / Heartburn',
  'Epigastric pain',
  'Loose stools',
  'Vomiting',
  'Nausea',
  'Hypertension follow-up',
  'Joint pain',
  'Generalized weakness',
];

// Fast common diagnoses
const COMMON_DIAGNOSES = [
  'Acute Viral Pyrexia',
  'Acute Upper Respiratory Tract Infection (URTI)',
  'Acute Bronchitis',
  'Acute Gastroenteritis',
  'Acute Gastritis / GERD',
  'Essential Hypertension',
  'Type 2 Diabetes Mellitus',
  'Migraine Headache',
  'Allergic Rhinitis',
  'Musculoskeletal Pain / Sprain',
  'Urinary Tract Infection (UTI)',
  'Iron Deficiency Anemia',
];

// Common clinic medicines quick pick list
const COMMON_MEDICINES = [
  { name: 'Tab. Paracetamol 650mg (Dolo 650)', dosage: '1 tablet', freq: '1-0-1', timing: 'After food', duration: '3 days', instructions: 'Take SOS if fever > 99 F' },
  { name: 'Tab. Pantoprazole 40mg (Pan 40)', dosage: '1 tablet', freq: '1-0-0', timing: 'Before breakfast', duration: '7 days', instructions: 'Take 30 mins before breakfast' },
  { name: 'Tab. Amoxicillin + Clavulanate 625mg (Augmentin)', dosage: '1 tablet', freq: '1-0-1', timing: 'After food', duration: '5 days', instructions: 'Complete full course' },
  { name: 'Tab. Azithromycin 500mg (Azee 500)', dosage: '1 tablet', freq: '1-0-0', timing: 'After food', duration: '3 days', instructions: 'Take once daily after lunch' },
  { name: 'Tab. Cefixime 200mg (Zifi 200)', dosage: '1 tablet', freq: '1-0-1', timing: 'After food', duration: '5 days', instructions: 'Take after meals' },
  { name: 'Tab. Cetirizine 10mg (Cetzine)', dosage: '1 tablet', freq: '0-0-1', timing: 'At bedtime', duration: '5 days', instructions: 'May cause mild drowsiness' },
  { name: 'Tab. Montelukast + Levocetirizine (Montair LC)', dosage: '1 tablet', freq: '0-0-1', timing: 'At bedtime', duration: '7 days', instructions: 'Take at night' },
  { name: 'Tab. Metformin 500mg', dosage: '1 tablet', freq: '1-0-1', timing: 'With meals', duration: '30 days', instructions: 'Monitor fasting blood sugar' },
  { name: 'Tab. Telmisartan 40mg (Telma 40)', dosage: '1 tablet', freq: '1-0-0', timing: 'After breakfast', duration: '30 days', instructions: 'Regular BP monitoring advised' },
  { name: 'Tab. Amlodipine 5mg', dosage: '1 tablet', freq: '1-0-0', timing: 'After breakfast', duration: '30 days', instructions: 'Daily morning dose' },
  { name: 'Syp. Ascoril D (100ml)', dosage: '10 ml (2 tsp)', freq: '1-1-1', timing: 'After food', duration: '5 days', instructions: 'Take with warm water' },
  { name: 'ORS Powder Sachet', dosage: '1 sachet', freq: 'SOS', timing: 'Throughout day', duration: '2 days', instructions: 'Dissolve in 1 liter clean drinking water' },
];

export default function DoctorConsultationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitIdParam = searchParams.get('visitId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active workspace state
  const [workspace, setWorkspace] = useState(null);
  const [showPrevHistory, setShowPrevHistory] = useState(true);

  // Modals state
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isCasePaperModalOpen, setIsCasePaperModalOpen] = useState(false);
  const [printablePrescriptionData, setPrintablePrescriptionData] = useState(null);
  const [printableCasePaperData, setPrintableCasePaperData] = useState(null);

  // Form states: Case paper
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [clinicalExamination, setClinicalExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Vitals state
  const [vitals, setVitals] = useState({
    bp: '',
    pulse: '',
    temperature: '',
    spo2: '',
    weight: '',
    height: '',
    bmi: '',
  });

  // Form states: Prescription
  const [medicines, setMedicines] = useState([]);
  const [adviceNotes, setAdviceNotes] = useState('');

  // Load workspace data
  useEffect(() => {
    async function loadData() {
      if (!visitIdParam) {
        // If no visitId provided, check if there is an active called patient in the live queue
        try {
          const queueRes = await queueService.getTodayQueue();
          if (queueRes.data.currentPatient) {
            navigate(`/doctor/consultation?visitId=${queueRes.data.currentPatient.id}`, { replace: true });
            return;
          }
        } catch (e) {
          // ignore
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await consultationService.getWorkspace(visitIdParam);
        const data = res.data;
        setWorkspace(data);

        // Populate case paper fields
        if (data.casePaper) {
          setChiefComplaints(data.casePaper.chiefComplaints || '');
          setMedicalHistory(data.casePaper.medicalHistory || '');
          setAllergies(data.casePaper.allergies || data.patient.allergies || '');
          setClinicalExamination(data.casePaper.clinicalExamination || '');
          setDiagnosis(data.casePaper.diagnosis || '');
          setDoctorNotes(data.casePaper.doctorNotes || '');
          setFollowUpInstructions(data.casePaper.followUpInstructions || '');
          setFollowUpDate(data.casePaper.followUpDate || '');

          if (data.casePaper.vitals) {
            setVitals({
              bp: data.casePaper.vitals.bp || '',
              pulse: data.casePaper.vitals.pulse || '',
              temperature: data.casePaper.vitals.temperature || '',
              spo2: data.casePaper.vitals.spo2 || '',
              weight: data.casePaper.vitals.weight || '',
              height: data.casePaper.vitals.height || '',
              bmi: data.casePaper.vitals.bmi || '',
            });
          }
        }

        // Populate prescription fields
        if (data.prescription) {
          setAdviceNotes(data.prescription.adviceNotes || '');
          if (Array.isArray(data.prescription.medicines) && data.prescription.medicines.length > 0) {
            setMedicines(data.prescription.medicines);
          } else {
            setMedicines([]);
          }
        } else {
          setMedicines([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load consultation workspace');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [visitIdParam, navigate]);

  // Auto calculate BMI when weight & height change
  const handleVitalsChange = (field, value) => {
    const updated = { ...vitals, [field]: value };

    const wt = parseFloat(updated.weight);
    const ht = parseFloat(updated.height);
    if (!isNaN(wt) && !isNaN(ht) && ht > 0) {
      const heightInMeters = ht / 100;
      const bmiCalc = (wt / (heightInMeters * heightInMeters)).toFixed(1);
      updated.bmi = bmiCalc;
    }
    setVitals(updated);
  };

  // Append complaint tag
  const appendComplaint = (tag) => {
    if (!chiefComplaints) {
      setChiefComplaints(tag);
    } else if (!chiefComplaints.toLowerCase().includes(tag.toLowerCase())) {
      setChiefComplaints(`${chiefComplaints}, ${tag}`);
    }
  };

  // Medicine table management
  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        medicineName: '',
        dosage: '1 tablet',
        frequency: '1-0-1',
        timing: 'After food',
        duration: '5 days',
        instructions: '',
      },
    ]);
  };

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const addQuickMedicine = (med) => {
    setMedicines([
      ...medicines,
      {
        medicineName: med.name,
        dosage: med.dosage,
        frequency: med.freq,
        timing: med.timing,
        duration: med.duration,
        instructions: med.instructions,
      },
    ]);
  };

  // Copy previous visit medicines if old patient
  const copyPreviousMedicines = () => {
    if (workspace?.previousVisit?.prescription?.medicines?.length > 0) {
      setMedicines([...workspace.previousVisit.prescription.medicines]);
      setSuccessMsg('Copied previous visit medicines into current prescription');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  // Quick follow up date helpers
  const setQuickFollowUp = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().split('T')[0]);
  };

  // Action: Save Draft
  const handleSaveDraft = async () => {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Save Case Paper Draft
      await consultationService.saveCasePaper(workspace.visit.id, {
        chiefComplaints,
        medicalHistory,
        allergies,
        clinicalExamination,
        vitals,
        diagnosis,
        doctorNotes,
        followUpInstructions,
        followUpDate: followUpDate || null,
        isFinalized: false,
      });

      // 2. Save Prescription Draft
      await consultationService.savePrescription(workspace.visit.id, {
        diagnosisSummary: diagnosis,
        adviceNotes,
        medicines,
        isFinalized: false,
      });

      setSuccessMsg('Consultation draft saved successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Action: Finalize Consultation & Print
  const handleFinalizeAndPrint = async () => {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Save and finalize Case Paper
      await consultationService.saveCasePaper(workspace.visit.id, {
        chiefComplaints,
        medicalHistory,
        allergies,
        clinicalExamination,
        vitals,
        diagnosis,
        doctorNotes,
        followUpInstructions,
        followUpDate: followUpDate || null,
        isFinalized: true,
      });

      // 2. Save and finalize Prescription (marks visit COMPLETED)
      await consultationService.savePrescription(workspace.visit.id, {
        diagnosisSummary: diagnosis,
        adviceNotes,
        medicines,
        isFinalized: true,
      });

      // 3. Fetch printable data and open print modal
      const printRes = await consultationService.getPrintablePrescription(workspace.visit.id);
      setPrintablePrescriptionData(printRes.data);
      setIsPrescriptionModalOpen(true);
      setSuccessMsg('Consultation marked COMPLETED! Ready to print prescription.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to finalize consultation');
    } finally {
      setSaving(false);
    }
  };

  // Action: Open Case Paper Print Modal
  const handlePrintCasePaper = async () => {
    if (!workspace) return;
    try {
      const res = await consultationService.getPrintableCasePaper(workspace.visit.id);
      setPrintableCasePaperData(res.data);
      setIsCasePaperModalOpen(true);
    } catch (err) {
      setError('Failed to load printable case paper');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <HeartPulse className="w-8 h-8 text-teal-600 animate-pulse" />
          <p className="text-sm font-medium text-slate-500">Opening Consultation Workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-xl mx-auto my-12">
        <Stethoscope className="w-12 h-12 text-teal-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No Active Consultation Selected</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Please select a patient from the Live Queue to begin examination and prescription writing.
        </p>
        <Link
          to="/doctor/queue"
          className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg inline-flex items-center space-x-2 transition"
        >
          <Clock className="w-4 h-4" />
          <span>Open Live Queue</span>
        </Link>
      </div>
    );
  }

  const { visit, patient, previousVisit } = workspace;
  const isOldPatient = visit.visitType === 'FOLLOW_UP' || Boolean(previousVisit);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Navigation & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/doctor/queue"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Back to Live Queue"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-teal-700" />
              <span>Doctor Consultation Workspace</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Dr. Sharad Motugade • Sanjeevani Clinic Offline LAN System
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintCasePaper}
            type="button"
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Print Case Paper</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            type="button"
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleFinalizeAndPrint}
            disabled={saving}
            type="button"
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finalize & Print Rx</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Patient Demographic & Visit Hero Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Token</span>
              <span className="text-xl font-extrabold text-teal-900 leading-tight">#{visit.tokenNumber}</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">{patient.fullName}</h2>
                <span className="bg-slate-100 text-slate-700 font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200">
                  {patient.uhid}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOldPatient 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isOldPatient ? 'FOLLOW-UP (OLD PATIENT)' : 'NEW PATIENT'}
                </span>
                {visit.priority === 'EMERGENCY' && (
                  <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                    EMERGENCY
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                <span>Age: <strong className="text-slate-700">{patient.age || '—'} Y</strong></span>
                <span>•</span>
                <span>Gender: <strong className="text-slate-700">{patient.gender}</strong></span>
                <span>•</span>
                <span>Blood: <strong className="text-slate-700">{patient.bloodGroup || '—'}</strong></span>
                <span>•</span>
                <span>Contact: <strong className="text-slate-700">{patient.mobileNumber}</strong></span>
                <span>•</span>
                <span>Visit: <strong className="text-slate-700 font-mono">{visit.visitNumber}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400">
            <p>Visit Time: {visit.visitDate} ({visit.visitTime})</p>
            <p className="mt-0.5">Status: <span className="font-semibold text-teal-700">{visit.status}</span></p>
          </div>
        </div>

        {/* Drug Allergy Warning Banner */}
        {patient.allergies && patient.allergies.toLowerCase() !== 'none' && (
          <div className="mt-4 pt-3 border-t border-rose-200 flex items-center gap-2 text-rose-800 bg-rose-50 px-3 py-2 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>KNOWN DRUG ALLERGIES:</span>
            <span className="text-rose-950 font-bold tracking-wide uppercase">{patient.allergies}</span>
          </div>
        )}
      </div>

      {/* Old Patient Previous Visit Reference Strip */}
      {isOldPatient && previousVisit && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
          <div
            onClick={() => setShowPrevHistory(!showPrevHistory)}
            className="px-5 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-amber-100/50 transition"
          >
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
              <History className="w-4 h-4 text-amber-700" />
              <span>PREVIOUS VISIT REFERENCE — {previousVisit.visitDate} (Visit #{previousVisit.visitNumber})</span>
            </div>
            <div className="flex items-center space-x-3">
              {previousVisit.prescription?.medicines?.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPreviousMedicines();
                  }}
                  className="bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold px-2.5 py-1 rounded flex items-center space-x-1 transition"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Previous Medicines</span>
                </button>
              )}
              {showPrevHistory ? <ChevronUp className="w-4 h-4 text-amber-700" /> : <ChevronDown className="w-4 h-4 text-amber-700" />}
            </div>
          </div>

          {showPrevHistory && (
            <div className="px-5 pb-4 pt-1 text-xs text-slate-800 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-900 uppercase">Past Complaints:</span>
                <p className="mt-0.5 text-slate-700 font-medium">{previousVisit.chiefComplaints || 'None recorded'}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-900 uppercase">Past Diagnosis:</span>
                <p className="mt-0.5 text-slate-900 font-bold">{previousVisit.diagnosis || 'General Consultation'}</p>
                {previousVisit.doctorNotes && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">{previousVisit.doctorNotes}</p>
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-900 uppercase">Past Prescribed Medicines:</span>
                {previousVisit.prescription?.medicines?.length > 0 ? (
                  <ul className="mt-0.5 space-y-0.5 list-disc list-inside text-slate-700">
                    {previousVisit.prescription.medicines.map((m, idx) => (
                      <li key={idx} className="truncate">
                        <strong>{m.medicineName}</strong> ({m.frequency})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-slate-400 italic">No medicines recorded</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Clinical Assessment (Left) + Prescription (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Vitals & Clinical Case Paper (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Vitals Recording Strip */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Patient Vitals</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Blood Pressure</label>
                <input
                  type="text"
                  placeholder="e.g. 120/80"
                  value={vitals.bp}
                  onChange={(e) => handleVitalsChange('bp', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Pulse (bpm)</label>
                <input
                  type="text"
                  placeholder="e.g. 78"
                  value={vitals.pulse}
                  onChange={(e) => handleVitalsChange('pulse', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Temp (°F)</label>
                <input
                  type="text"
                  placeholder="e.g. 98.6"
                  value={vitals.temperature}
                  onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">SpO2 (%)</label>
                <input
                  type="text"
                  placeholder="e.g. 98"
                  value={vitals.spo2}
                  onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Weight (kg)</label>
                <input
                  type="text"
                  placeholder="e.g. 68"
                  value={vitals.weight}
                  onChange={(e) => handleVitalsChange('weight', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Height (cm)</label>
                <input
                  type="text"
                  placeholder="e.g. 170"
                  value={vitals.height}
                  onChange={(e) => handleVitalsChange('height', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {vitals.bmi && (
              <div className="mt-2 text-[11px] text-teal-800 bg-teal-50/70 p-1.5 rounded flex items-center justify-between font-medium">
                <span>Calculated BMI: <strong>{vitals.bmi} kg/m²</strong></span>
                <span className="text-[10px] text-teal-600">
                  {parseFloat(vitals.bmi) < 18.5 ? 'Underweight' : parseFloat(vitals.bmi) <= 24.9 ? 'Normal weight' : 'Overweight'}
                </span>
              </div>
            )}
          </div>

          {/* Clinical Examination & Complaints */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Case Paper Details</span>
            </h3>

            {/* Chief Complaints */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {isOldPatient ? 'Current Presenting Complaints' : 'Chief Complaints'}
                </label>
              </div>
              <textarea
                rows={2}
                placeholder="Record patient complaints, duration, and severity..."
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />

              {/* Quick tags */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_COMPLAINTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => appendComplaint(c)}
                    className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 px-2 py-0.5 rounded transition"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Relevant Medical History */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Medical & Surgical History
              </label>
              <textarea
                rows={2}
                placeholder="Known chronic illnesses, previous surgeries, long-term medications..."
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Allergies field (updates master record) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Drug Allergies / Hypersensitivity
              </label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Sulfa drugs, NSAIDs (or None)"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Synchronizes permanently to patient master profile.
              </span>
            </div>

            {/* Clinical Examination */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Clinical Examination
              </label>
              <textarea
                rows={2}
                placeholder="General condition, chest/RS, CVS, abdomen, ENT, throat, local findings..."
                value={clinicalExamination}
                onChange={(e) => setClinicalExamination(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Diagnosis with quick chips */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Provisional / Confirmed Diagnosis
              </label>
              <input
                type="text"
                placeholder="Enter clinical diagnosis..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-bold text-slate-900"
              />

              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_DIAGNOSES.slice(0, 6).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiagnosis(d)}
                    className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 px-2 py-0.5 rounded transition"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Private Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Doctor Notes (Clinical Plan & Observations)
              </label>
              <textarea
                rows={2}
                placeholder="Private clinical notes, test recommendations, differential diagnosis..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Structured Prescription Generator (7 Columns) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="font-serif text-2xl font-bold text-teal-800">℞</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Prescription Writing</h3>
                  <p className="text-[11px] text-slate-400">Structured dosage, frequency & duration</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addMedicineRow}
                className="bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            {/* Quick Pick Medicines Toolbar */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Add Common Clinic Medications:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_MEDICINES.slice(0, 8).map((med, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addQuickMedicine(med)}
                    className="text-[11px] bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 px-2 py-1 rounded border border-slate-200 transition font-medium text-left"
                  >
                    + {med.name.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Medicines Dynamic Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-y border-slate-200">
                    <th className="py-2 px-2 w-8">#</th>
                    <th className="py-2 px-2">Medicine Name & Strength</th>
                    <th className="py-2 px-1 w-24">Dosage</th>
                    <th className="py-2 px-1 w-24">Frequency</th>
                    <th className="py-2 px-1 w-24">Timing</th>
                    <th className="py-2 px-1 w-20">Duration</th>
                    <th className="py-2 px-2">Instructions</th>
                    <th className="py-2 px-1 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-slate-400 font-bold">{idx + 1}</td>

                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="e.g. Tab. Paracetamol 650mg"
                          value={med.medicineName}
                          onChange={(e) => updateMedicine(idx, 'medicineName', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 font-semibold text-slate-900"
                        />
                      </td>

                      <td className="py-2 px-1">
                        <input
                          type="text"
                          placeholder="1 tab"
                          value={med.dosage}
                          onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 text-center"
                        />
                      </td>

                      <td className="py-2 px-1">
                        <select
                          value={med.frequency}
                          onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 bg-white font-medium"
                        >
                          <option value="1-0-1">1-0-1 (M-N)</option>
                          <option value="1-0-0">1-0-0 (Morning)</option>
                          <option value="0-0-1">0-0-1 (Night)</option>
                          <option value="1-1-1">1-1-1 (TID)</option>
                          <option value="1-1-1-1">1-1-1-1 (QID)</option>
                          <option value="SOS">SOS (As needed)</option>
                        </select>
                      </td>

                      <td className="py-2 px-1">
                        <select
                          value={med.timing}
                          onChange={(e) => updateMedicine(idx, 'timing', e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 bg-white"
                        >
                          <option value="After food">After food</option>
                          <option value="Before food">Before food</option>
                          <option value="With meals">With meals</option>
                          <option value="At bedtime">At bedtime</option>
                          <option value="Empty stomach">Empty stomach</option>
                        </select>
                      </td>

                      <td className="py-2 px-1">
                        <input
                          type="text"
                          placeholder="5 days"
                          value={med.duration}
                          onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 text-center"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="Special instructions"
                          value={med.instructions || ''}
                          onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 text-slate-600"
                        />
                      </td>

                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeMedicine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Remove medicine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {medicines.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-400 italic">
                        No medicines added yet. Click &quot;Add Medicine&quot; or select from common medications above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Advice & Dietary Instructions */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Advice & Dietary Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Advise rest, adequate fluid intake, dietary restrictions (avoid oily/spicy food, reduce salt), lifestyle modifications..."
                value={adviceNotes}
                onChange={(e) => setAdviceNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Follow-up Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>Next Follow-up</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                  <div className="flex gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(3)}
                      className="text-[10px] bg-white border border-slate-200 hover:bg-teal-50 px-2 py-0.5 rounded text-slate-600"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(5)}
                      className="text-[10px] bg-white border border-slate-200 hover:bg-teal-50 px-2 py-0.5 rounded text-slate-600"
                    >
                      +5 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(7)}
                      className="text-[10px] bg-white border border-slate-200 hover:bg-teal-50 px-2 py-0.5 rounded text-slate-600"
                    >
                      +1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(14)}
                      className="text-[10px] bg-white border border-slate-200 hover:bg-teal-50 px-2 py-0.5 rounded text-slate-600"
                    >
                      +2 Weeks
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">Follow-up Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Return if fever persists or SOS"
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Medicines prescribed: <strong className="text-slate-700">{medicines.length}</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeAndPrint}
                  disabled={saving}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-5 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalize & Print Prescription</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrintablePrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        data={printablePrescriptionData}
      />

      <PrintableCasePaperModal
        isOpen={isCasePaperModalOpen}
        onClose={() => setIsCasePaperModalOpen(false)}
        data={printableCasePaperData}
      />
    </div>
  );
}


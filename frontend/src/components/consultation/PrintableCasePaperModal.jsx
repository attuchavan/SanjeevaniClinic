import React, { useRef } from 'react';
import { Printer, X, FileText, Calendar, Activity, AlertTriangle, User, Stethoscope } from 'lucide-react';

export default function PrintableCasePaperModal({ isOpen, onClose, data }) {
  const printRef = useRef(null);

  if (!isOpen || !data) return null;

  const { clinic, visit, patient, casePaper, previousVisit } = data;
  const isOldPatient = casePaper?.casePaperType === 'OLD' || visit?.visitType === 'FOLLOW_UP';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-case-paper, #printable-case-paper * {
            visibility: visible !important;
          }
          #printable-case-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Action Header Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span className="font-semibold text-sm tracking-wide">
              Case Paper Record — {patient?.fullName} ({patient?.uhid})
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isOldPatient 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isOldPatient ? 'FOLLOW-UP (OLD PATIENT)' : 'NEW PATIENT CASE'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Case Paper</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div className="overflow-y-auto p-8 bg-slate-50 print:bg-white print:p-0 flex-1">
          <div
            id="printable-case-paper"
            ref={printRef}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 print:p-0 print:border-none print:shadow-none mx-auto max-w-3xl text-slate-800"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-5 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
                  {clinic?.name || 'SANJEEVANI CLINIC'}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Clinical Examination & Patient Case Paper
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold text-slate-900">{clinic?.doctorName || 'Dr. Sharad Motugade'}</h2>
                <p className="text-xs text-slate-500">{clinic?.qualifications || 'M.B.B.S., M.D. (Physician & Consultant)'}</p>
                <div className="inline-block mt-1 bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300">
                  {isOldPatient ? 'FORMAT: OLD PATIENT FOLLOW-UP' : 'FORMAT: NEW PATIENT REGISTRATION'}
                </div>
              </div>
            </div>

            {/* Patient Demographic Summary */}
            <div className="border border-slate-300 rounded-lg p-3 text-xs mb-5 bg-slate-50/50">
              <div className="grid grid-cols-4 gap-2 mb-2 pb-2 border-b border-slate-200">
                <div>
                  <span className="text-slate-500">Patient Name:</span>
                  <p className="font-bold text-slate-900 text-sm">{patient?.fullName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Age / Gender:</span>
                  <p className="font-semibold text-slate-800">{patient?.age || '—'} Y / {patient?.gender}</p>
                </div>
                <div>
                  <span className="text-slate-500">UHID:</span>
                  <p className="font-mono font-bold text-slate-900">{patient?.uhid}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Visit Date / Time:</span>
                  <p className="font-semibold text-slate-800">{visit?.visitDate} ({visit?.visitTime})</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500">Mobile Number:</span>
                  <p className="font-semibold text-slate-800">{patient?.mobileNumber}</p>
                </div>
                <div>
                  <span className="text-slate-500">Blood Group:</span>
                  <p className="font-semibold text-slate-800">{patient?.bloodGroup || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Address:</span>
                  <p className="font-medium text-slate-700 truncate">{patient?.address || 'Not provided'}</p>
                </div>
              </div>

              {/* Allergy Alert */}
              {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2 py-1 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">Allergies / Hypersensitivity:</span>
                  <span className="font-bold">{patient.allergies}</span>
                </div>
              )}
            </div>

            {/* Vitals Summary Strip */}
            <div className="border border-slate-300 rounded-lg p-2.5 mb-5 bg-teal-50/40 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-teal-900 mb-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-700" />
                <span>Recorded Vitals</span>
              </div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <div className="bg-white p-1 rounded border border-teal-100">
                  <span className="text-[10px] text-slate-400 block font-medium">BP</span>
                  <span className="font-bold text-slate-900">{casePaper?.vitals?.bp || '—'}</span>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Pulse</span>
                  <span className="font-bold text-slate-900">{casePaper?.vitals?.pulse || '—'}</span>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Temperature</span>
                  <span className="font-bold text-slate-900">{casePaper?.vitals?.temperature || '—'}</span>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100">
                  <span className="text-[10px] text-slate-400 block font-medium">SpO2</span>
                  <span className="font-bold text-slate-900">{casePaper?.vitals?.spo2 || '—'}</span>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Weight</span>
                  <span className="font-bold text-slate-900">{casePaper?.vitals?.weight || '—'}</span>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100">
                  <span className="text-[10px] text-slate-400 block font-medium">BMI</span>
                  <span className="font-bold text-slate-900">{casePaper?.vitals?.bmi || '—'}</span>
                </div>
              </div>
            </div>

            {/* IF OLD PATIENT: Previous Visit Reference Box */}
            {isOldPatient && previousVisit && (
              <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 text-xs mb-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Previous Visit Reference ({previousVisit.visitDate})
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono">Visit #{previousVisit.visitNumber}</span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <p><span className="font-medium text-slate-500">Past Complaints:</span> {previousVisit.chiefComplaints || '—'}</p>
                  <p><span className="font-medium text-slate-500">Past Diagnosis:</span> <strong className="text-slate-900">{previousVisit.diagnosis || '—'}</strong></p>
                  {previousVisit.doctorNotes && (
                    <p><span className="font-medium text-slate-500">Past Notes:</span> {previousVisit.doctorNotes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Clinical Evaluation Details */}
            <div className="space-y-3.5 text-xs">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                  {isOldPatient ? 'Current Presenting Complaints:' : 'Chief Complaints:'}
                </h3>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 min-h-[40px] text-slate-800 whitespace-pre-line font-medium">
                  {casePaper?.chiefComplaints || 'No complaints recorded'}
                </div>
              </div>

              {!isOldPatient && (
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1">Relevant Medical History:</h3>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 min-h-[32px] text-slate-800 whitespace-pre-line">
                    {casePaper?.medicalHistory || 'No significant previous medical history reported'}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1">Clinical Examination Findings:</h3>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 min-h-[40px] text-slate-800 whitespace-pre-line">
                  {casePaper?.clinicalExamination || 'General and systemic examination within normal limits'}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1">Diagnosis / Assessment:</h3>
                <div className="bg-slate-100 p-2.5 rounded border border-slate-300 font-bold text-slate-900 text-sm">
                  {casePaper?.diagnosis || 'Provisional Evaluation'}
                </div>
              </div>

              {casePaper?.doctorNotes && (
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1">Doctor Notes & Plan:</h3>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800 whitespace-pre-line">
                    {casePaper.doctorNotes}
                  </div>
                </div>
              )}

              {casePaper?.followUpInstructions && (
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-1">Follow-up Instructions:</h3>
                  <div className="bg-teal-50/60 p-2.5 rounded border border-teal-200 text-teal-900 font-medium">
                    {casePaper.followUpInstructions}
                    {casePaper.followUpDate && (
                      <span className="block mt-1 font-bold">Scheduled Follow-up Date: {casePaper.followUpDate}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Signature & Date */}
            <div className="pt-10 flex justify-between items-end border-t border-slate-200 mt-6">
              <div className="text-[10px] text-slate-400">
                <p>Printed from Sanjeevani Clinic Management System</p>
                <p>Visit #{visit?.visitNumber || '—'} • Token #{visit?.tokenNumber || '—'}</p>
              </div>

              <div className="text-right">
                <div className="w-44 border-b border-slate-400 mb-1"></div>
                <p className="text-xs font-bold text-slate-900">{clinic?.doctorName || 'Dr. Sharad Motugade'}</p>
                <p className="text-[10px] text-slate-500">Attending Physician</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

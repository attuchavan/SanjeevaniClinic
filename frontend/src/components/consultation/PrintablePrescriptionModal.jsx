import React, { useRef } from 'react';
import { Printer, X, Download, AlertTriangle, ShieldCheck, Calendar, Clock, Phone, MapPin } from 'lucide-react';

export default function PrintablePrescriptionModal({ isOpen, onClose, data }) {
  const printRef = useRef(null);

  if (!isOpen || !data) return null;

  const { clinic, visit, patient, vitals, diagnosis, chiefComplaints, medicines, adviceNotes, followUpDate, followUpInstructions, isFinalized, finalizedAt } = data;

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
          #printable-prescription-pad, #printable-prescription-pad * {
            visibility: visible !important;
          }
          #printable-prescription-pad {
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
        {/* Action Header Bar (Excluded in Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-teal-400" />
            <span className="font-semibold text-sm tracking-wide">
              Prescription Print Preview — {patient?.fullName} ({patient?.uhid})
            </span>
            {isFinalized && (
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-500/30">
                Finalized
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Prescription</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div className="overflow-y-auto p-8 bg-slate-50 print:bg-white print:p-0 flex-1">
          <div
            id="printable-prescription-pad"
            ref={printRef}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 print:p-0 print:border-none print:shadow-none mx-auto max-w-3xl"
          >
            {/* Header: Sanjeevani Clinic & Doctor Header */}
            <div className="border-b-2 border-teal-700 pb-4 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-teal-800 font-serif">
                    {clinic?.name || 'SANJEEVANI CLINIC'}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium tracking-wide">
                    {clinic?.tagline || 'Family Health Care & General Medical Consultation'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-teal-700" /> {clinic?.address || 'Main Road, Clinic Complex'}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-teal-700" /> {clinic?.phone || '+91 98765 43210'}</span>
                  </p>
                </div>

                <div className="text-right">
                  <h2 className="text-base font-bold text-slate-900">
                    {clinic?.doctorName || 'Dr. Sharad Motugade'}
                  </h2>
                  <p className="text-xs text-teal-700 font-semibold">
                    {clinic?.qualifications || 'M.B.B.S., M.D. (Physician & Consultant)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reg. No: {clinic?.regNo || 'MCI-1998-54321'}
                  </p>
                </div>
              </div>
            </div>

            {/* Patient Demographic & Vitals Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-xs text-slate-700">
              <div className="grid grid-cols-4 gap-2 mb-2 pb-2 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium">Patient Name:</span>{' '}
                  <span className="font-bold text-slate-900">{patient?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Age / Gender:</span>{' '}
                  <span className="font-semibold text-slate-800">{patient?.age || '—'} Y / {patient?.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">UHID:</span>{' '}
                  <span className="font-mono font-bold text-teal-800">{patient?.uhid}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-medium">Date:</span>{' '}
                  <span className="font-semibold text-slate-800">{visit?.visitDate} ({visit?.visitTime})</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 font-medium">Token #:</span>{' '}
                  <span className="font-bold text-slate-900">#{visit?.tokenNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Blood Group:</span>{' '}
                  <span className="font-semibold text-slate-800">{patient?.bloodGroup || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Vitals:</span>{' '}
                  <span className="font-medium text-slate-800">
                    {vitals?.bp ? `BP: ${vitals.bp}` : ''}
                    {vitals?.pulse ? ` | P: ${vitals.pulse}` : ''}
                    {vitals?.weight ? ` | Wt: ${vitals.weight}` : ''}
                    {!vitals?.bp && !vitals?.pulse && !vitals?.weight && 'Standard'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-medium">Contact:</span>{' '}
                  <span className="font-semibold text-slate-800">{patient?.mobileNumber}</span>
                </div>
              </div>

              {/* Allergy Warning if exists */}
              {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center gap-1.5 text-rose-700 bg-rose-50/60 px-2 py-1 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">Known Drug Allergies:</span>
                  <span className="font-bold uppercase tracking-wide">{patient.allergies}</span>
                </div>
              )}
            </div>

            {/* Diagnosis / Complaints */}
            <div className="mb-4">
              <div className="flex items-baseline space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnosis:</span>
                <span className="text-sm font-bold text-slate-900">{diagnosis || 'General Medical Consultation'}</span>
              </div>
              {chiefComplaints && (
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-medium text-slate-500">Complaints:</span> {chiefComplaints}
                </p>
              )}
            </div>

            {/* Rx Symbol */}
            <div className="flex items-center space-x-2 my-3">
              <span className="font-serif text-2xl font-bold text-teal-800">℞</span>
              <div className="h-0.5 bg-teal-100 flex-1"></div>
            </div>

            {/* Medicines Schedule Table */}
            <div className="mb-6">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600">
                    <th className="py-2 px-1 w-8">#</th>
                    <th className="py-2 px-2">Medicine Name & Strength</th>
                    <th className="py-2 px-2">Dosage</th>
                    <th className="py-2 px-2">Frequency</th>
                    <th className="py-2 px-2">Timing</th>
                    <th className="py-2 px-2">Duration</th>
                    <th className="py-2 px-2">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines && medicines.length > 0 ? (
                    medicines.map((med, idx) => (
                      <tr key={med.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-1 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900">{med.medicineName}</td>
                        <td className="py-2.5 px-2 text-slate-700 font-medium">{med.dosage}</td>
                        <td className="py-2.5 px-2 text-slate-800 font-semibold">{med.frequency}</td>
                        <td className="py-2.5 px-2 text-teal-700 font-medium">{med.timing}</td>
                        <td className="py-2.5 px-2 text-slate-700 font-medium">{med.duration}</td>
                        <td className="py-2.5 px-2 text-slate-500 italic">{med.instructions || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-4 text-center text-slate-400 italic">
                        No medicines prescribed for this consultation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Advice and Follow-up Section */}
            {(adviceNotes || followUpDate || followUpInstructions) && (
              <div className="border-t border-slate-200 pt-3 mb-8">
                {adviceNotes && (
                  <div className="mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Advice / Diet Notes:</span>
                    <p className="text-xs text-slate-800 whitespace-pre-line mt-0.5 font-medium">{adviceNotes}</p>
                  </div>
                )}

                {(followUpDate || followUpInstructions) && (
                  <div className="flex items-center space-x-2 text-xs text-slate-700 mt-2 bg-teal-50/50 p-2 rounded border border-teal-100">
                    <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className="font-semibold text-teal-900">Next Follow-Up:</span>
                    <span className="font-bold text-slate-900">
                      {followUpDate ? `On or before ${followUpDate}` : ''}
                    </span>
                    {followUpInstructions && (
                      <span className="text-slate-600">({followUpInstructions})</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Doctor Signature Block */}
            <div className="pt-10 flex justify-between items-end">
              <div className="text-[10px] text-slate-400">
                <p>Printed on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p>Visit #{visit?.visitNumber || '—'} • Token #{visit?.tokenNumber || '—'}</p>
                <p className="italic">Sanjeevani Clinic Offline LAN System</p>
              </div>

              <div className="text-right">
                <div className="w-44 border-b border-slate-400 mb-1"></div>
                <p className="text-xs font-bold text-slate-900">{clinic?.doctorName || 'Dr. Sharad Motugade'}</p>
                <p className="text-[10px] text-slate-500 font-medium">Physician & Consultant</p>
                <p className="text-[10px] text-slate-400">Signature & Clinic Seal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

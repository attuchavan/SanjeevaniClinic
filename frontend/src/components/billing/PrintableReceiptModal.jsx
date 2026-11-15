import React, { useRef } from 'react';
import { Printer, X, Receipt, CheckCircle2, Clock, Phone, MapPin, IndianRupee, ShieldCheck } from 'lucide-react';

export default function PrintableReceiptModal({ isOpen, onClose, data }) {
  const printRef = useRef(null);

  if (!isOpen || !data) return null;

  const { clinic, receipt, patient, visit, billing, printedAt } = data;

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
          #printable-payment-receipt, #printable-payment-receipt * {
            visibility: visible !important;
          }
          #printable-payment-receipt {
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

      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Action Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-teal-400" />
            <span className="font-semibold text-sm tracking-wide">
              Payment Receipt — {receipt?.receiptNumber}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              receipt?.paymentStatus === 'PAID'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {receipt?.paymentStatus}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="overflow-y-auto p-6 bg-slate-50 print:bg-white print:p-0 flex-1">
          <div
            id="printable-payment-receipt"
            ref={printRef}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 print:p-0 print:border-none print:shadow-none mx-auto max-w-xl text-slate-800"
          >
            {/* Header: Sanjeevani Clinic */}
            <div className="border-b-2 border-teal-700 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-teal-800 font-serif">
                    {clinic?.name || 'SANJEEVANI CLINIC'}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    {clinic?.tagline || 'Family Health Care & General Medical Consultation'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-teal-700" /> {clinic?.address || 'Main Road, Sangli'}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-teal-700" /> {clinic?.phone || '+91 98765 43210'}</span>
                  </p>
                </div>

                <div className="text-right">
                  <h2 className="text-sm font-bold text-slate-900">{clinic?.doctorName || 'Dr. Sharad Motugade'}</h2>
                  <p className="text-[11px] text-teal-700 font-semibold">{clinic?.qualifications || 'M.B.B.S., M.D. (Physician)'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Reg. No: {clinic?.regNo || 'MCI-1998-54321'}</p>
                </div>
              </div>
            </div>

            {/* Receipt Title Banner */}
            <div className="bg-slate-100 py-1.5 px-3 rounded flex items-center justify-between text-xs font-bold text-slate-700 mb-4">
              <span className="uppercase tracking-wider">Consultation Fee Receipt</span>
              <span className="font-mono text-teal-800">{receipt?.receiptNumber}</span>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4 pb-3 border-b border-slate-200">
              <div>
                <p><span className="text-slate-500 font-medium">Patient Name:</span> <strong className="text-slate-900">{patient?.fullName}</strong></p>
                <p className="mt-0.5"><span className="text-slate-500 font-medium">UHID:</span> <strong className="font-mono text-slate-800">{patient?.uhid}</strong></p>
                <p className="mt-0.5"><span className="text-slate-500 font-medium">Age / Gender:</span> {patient?.age || '—'} Y / {patient?.gender}</p>
                <p className="mt-0.5"><span className="text-slate-500 font-medium">Mobile:</span> {patient?.mobileNumber}</p>
              </div>

              <div className="text-right">
                <p><span className="text-slate-500 font-medium">Receipt Date:</span> <strong>{receipt?.paymentDate}</strong></p>
                <p className="mt-0.5"><span className="text-slate-500 font-medium">Token #:</span> <strong className="text-teal-800">#{visit?.tokenNumber}</strong></p>
                <p className="mt-0.5"><span className="text-slate-500 font-medium">Visit #:</span> <span className="font-mono">{visit?.visitNumber}</span></p>
                <p className="mt-0.5"><span className="text-slate-500 font-medium">Payment Mode:</span> <strong className="uppercase">{receipt?.paymentMode}</strong></p>
                {receipt?.transactionReference && (
                  <p className="mt-0.5 text-[11px] text-slate-600 font-mono">Ref: {receipt.transactionReference}</p>
                )}
              </div>
            </div>

            {/* Payment Particulars Table */}
            <div className="mb-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600">
                    <th className="py-2 px-1">Particulars</th>
                    <th className="py-2 px-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-1">
                      <div className="font-bold text-slate-900">General Consultation & Clinical Examination Fee</div>
                      <div className="text-[11px] text-slate-500">Dr. Sharad Motugade • Sanjeevani Clinic</div>
                      {receipt?.notes && (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Note: {receipt.notes}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 text-sm">
                      ₹{billing?.amountCharged?.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td className="py-2 px-1 font-bold text-slate-800">Total Amount Paid:</td>
                    <td className="py-2 px-2 text-right font-mono font-extrabold text-teal-800 text-base">
                      ₹{billing?.amountPaid?.toFixed(2)}
                    </td>
                  </tr>
                  {billing?.balancePending > 0 && (
                    <tr className="text-rose-700">
                      <td className="py-1 px-1 font-semibold">Balance Due / Pending:</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        ₹{billing?.balancePending?.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Amount in words */}
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs mb-6">
              <span className="text-slate-500 font-medium">Amount Received in Words:</span>
              <p className="font-bold text-slate-900 mt-0.5">{billing?.amountInWords}</p>
            </div>

            {/* Signatures & Footer */}
            <div className="pt-8 flex justify-between items-end border-t border-slate-200">
              <div className="text-[10px] text-slate-400">
                <p>Generated by: {receipt?.collectedBy || 'Clinic Reception'}</p>
                <p>Printed: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="italic">Computer-generated receipt &bull; Sanjeevani Clinic</p>
              </div>

              <div className="text-right">
                <div className="w-36 border-b border-slate-400 mb-1"></div>
                <p className="text-xs font-bold text-slate-900">Authorized Signatory</p>
                <p className="text-[10px] text-slate-500">Sanjeevani Clinic</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

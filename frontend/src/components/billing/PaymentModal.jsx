import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Banknote,
  FileText,
  User,
  Clock,
  Receipt,
  Loader2,
} from 'lucide-react';
import billingService from '../../services/billingService';

const QUICK_AMOUNTS = [200, 300, 500, 1000];

export default function PaymentModal({ isOpen, onClose, visit, onSuccess }) {
  const [amountCharged, setAmountCharged] = useState(300);
  const [amountPaid, setAmountPaid] = useState(300);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [visitBillingHistory, setVisitBillingHistory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && visit) {
      setError(null);
      setPaymentMode('CASH');
      setTransactionReference('');
      setNotes('');

      // Fetch existing payments for this visit if any
      setLoadingHistory(true);
      billingService
        .getPaymentsByVisit(visit.id)
        .then((res) => {
          setVisitBillingHistory(res.data);
          if (res.data && res.data.payments.length > 0) {
            // If already billed, set remaining balance as suggested amount
            const remaining = res.data.balancePending;
            setAmountCharged(remaining > 0 ? remaining : 0);
            setAmountPaid(remaining > 0 ? remaining : 0);
          } else {
            setAmountCharged(300);
            setAmountPaid(300);
          }
        })
        .catch(() => {
          setAmountCharged(300);
          setAmountPaid(300);
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const chargedNum = Number(amountCharged) || 0;
  const paidNum = Number(amountPaid) || 0;
  const pendingDue = Math.max(0, chargedNum - paidNum);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (chargedNum <= 0) {
      setError('Please enter a valid consultation fee');
      return;
    }
    if (paidNum < 0) {
      setError('Amount paid cannot be negative');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await billingService.createPayment({
        visitId: visit.id,
        patientId: visit.patientId || visit.patient_id,
        amountCharged: chargedNum,
        amountPaid: paidNum,
        paymentMode,
        transactionReference: paymentMode === 'UPI' ? transactionReference : null,
        notes: notes.trim() || null,
      });

      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#102a43] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm tracking-wide">Collect Consultation Fee</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient & Visit Pill Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-sm border border-teal-200">
                #{visit.tokenNumber || visit.token_number}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{visit.patientName || visit.full_name}</h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {visit.uhid} &bull; {visit.visitType || visit.visit_type}
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
              Visit #{visit.visitNumber || visit.visit_number}
            </span>
          </div>

          {/* Past payments for this visit warning if any */}
          {visitBillingHistory && visitBillingHistory.payments?.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200 text-xs flex justify-between items-center text-slate-600">
              <span>
                Previous Payments: <strong>₹{visitBillingHistory.totalPaid}</strong> of ₹{visitBillingHistory.totalCharged}
              </span>
              <span className={`font-bold ${visitBillingHistory.balancePending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {visitBillingHistory.balancePending > 0 ? `Pending: ₹${visitBillingHistory.balancePending}` : 'Fully Paid'}
              </span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Fee Charged */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Consultation Fee Charged (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="10"
                value={amountCharged}
                onChange={(e) => setAmountCharged(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-bold text-slate-900"
                required
              />
            </div>

            {/* Quick amount chips */}
            <div className="flex gap-1.5 mt-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setAmountCharged(amt);
                    setAmountPaid(amt);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded border font-semibold transition ${
                    chargedNum === amt
                      ? 'bg-teal-50 text-teal-800 border-teal-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">Amount Paid (₹)</label>
              <button
                type="button"
                onClick={() => setAmountPaid(amountCharged)}
                className="text-[11px] font-bold text-teal-700 hover:underline"
              >
                Full Payment
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="10"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-bold text-teal-800"
                required
              />
            </div>

            {/* Pending Balance Badge */}
            <div className="mt-1.5 text-xs flex justify-between items-center">
              <span className="text-slate-500">Pending Balance:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  pendingDue === 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {pendingDue === 0 ? 'Nil (Fully Settled)' : `₹${pendingDue.toFixed(2)} Pending`}
              </span>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'OTHER', label: 'Other', icon: IndianRupee },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* UPI Reference if UPI selected */}
          {paymentMode === 'UPI' && (
            <div className="animate-in fade-in duration-150">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                UPI Reference / UTR Number
              </label>
              <input
                type="text"
                placeholder="e.g. 987654321012 or UPI Ref"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-mono"
              />
            </div>
          )}

          {/* Reception Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Receipt Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Follow-up consultation discount, concession, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Collect ₹{paidNum} & Print Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

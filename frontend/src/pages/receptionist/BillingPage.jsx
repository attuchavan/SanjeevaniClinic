import React, { useState, useEffect } from 'react';
import {
  Receipt,
  IndianRupee,
  Search,
  Calendar,
  Printer,
  Plus,
  RefreshCw,
  QrCode,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  User,
  CreditCard,
} from 'lucide-react';
import billingService from '../../services/billingService';
import queueService from '../../services/queueService';
import PrintableReceiptModal from '../../components/billing/PrintableReceiptModal';
import PaymentModal from '../../components/billing/PaymentModal';

export default function BillingPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modals state
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVisitForPayment, setSelectedVisitForPayment] = useState(null);

  // Quick Visit Selector modal state
  const [isVisitSelectorOpen, setIsVisitSelectorOpen] = useState(false);
  const [activeVisits, setActiveVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await billingService.getCollectionsSummary(dateFilter);
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load collections summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const res = await billingService.searchPayments({
        query: search.trim(),
        paymentMode: modeFilter || undefined,
        paymentStatus: statusFilter || undefined,
        startDate: dateFilter || undefined,
        endDate: dateFilter || undefined,
        page,
        limit: 15,
      });
      setPayments(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to search payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, modeFilter, statusFilter, dateFilter]);

  const handlePrintReceipt = async (paymentId) => {
    try {
      const res = await billingService.getPrintableReceipt(paymentId);
      setSelectedReceipt(res.data);
      setIsReceiptModalOpen(true);
    } catch (err) {
      alert('Failed to load printable receipt');
    }
  };

  const handleOpenVisitSelector = async () => {
    setIsVisitSelectorOpen(true);
    setVisitsLoading(true);
    try {
      const res = await queueService.getTodayQueue();
      setActiveVisits(res.data.allVisits || []);
    } catch (err) {
      console.error('Failed to load queue visits:', err);
    } finally {
      setVisitsLoading(false);
    }
  };

  const handleSelectVisit = (v) => {
    setSelectedVisitForPayment({
      id: v.id,
      patientId: v.patient_id,
      patientName: v.full_name,
      uhid: v.uhid,
      tokenNumber: v.token_number,
      visitNumber: v.visit_number,
      visitType: v.visit_type,
    });
    setIsVisitSelectorOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (createdPayment) => {
    setIsPaymentModalOpen(false);
    await fetchSummary();
    await fetchPayments(1);

    // Open receipt modal automatically
    try {
      const printData = await billingService.getPrintableReceipt(createdPayment.id);
      setSelectedReceipt(printData.data);
      setIsReceiptModalOpen(true);
    } catch (e) {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-700" />
            <span>Billing & Payment Collections</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Record patient consultation fees, generate sequential receipts, track cash & UPI collections
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchSummary();
              fetchPayments(pagination.page);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenVisitSelector}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Fee Payment</span>
          </button>
        </div>
      </div>

      {/* Daily Collections Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Today */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Collections</p>
              <h3 className="text-2xl font-extrabold text-teal-800 mt-1">
                ₹{summary?.today?.totalCollected?.toLocaleString('en-IN') || '0'}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Cash: <strong>₹{summary?.today?.cashCollected || 0}</strong></span>
            <span>&bull;</span>
            <span>UPI: <strong>₹{summary?.today?.upiCollected || 0}</strong></span>
          </div>
        </div>

        {/* Receipts Today */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Receipts Issued</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary?.today?.receiptCount || 0}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Avg Fee: <strong>₹{summary?.today?.receiptCount ? Math.round(summary.today.totalCollected / summary.today.receiptCount) : 0}</strong> / patient
          </div>
        </div>

        {/* Pending Dues Today */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Dues</p>
              <h3 className={`text-2xl font-extrabold mt-1 ${summary?.today?.pendingDues > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                ₹{summary?.today?.pendingDues?.toLocaleString('en-IN') || '0'}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {summary?.today?.pendingCount || 0} partial/pending receipt(s)
          </div>
        </div>

        {/* Month to Date Collections */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Month-to-Date</p>
              <h3 className="text-2xl font-extrabold text-[#102a43] mt-1">
                ₹{summary?.monthToDate?.totalCollected?.toLocaleString('en-IN') || '0'}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {summary?.monthToDate?.receiptCount || 0} consultations in {summary?.month || 'this month'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipt #, patient name, UHID, mobile, or UPI ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Payment Mode */}
          <div className="lg:col-span-2">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">All Payment Modes</option>
              <option value="CASH">Cash Only</option>
              <option value="UPI">UPI / QR Only</option>
              <option value="CARD">Card Only</option>
            </select>
          </div>

          {/* Status */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIAL">Partial Payment</option>
              <option value="PENDING">Pending Dues</option>
            </select>
          </div>

          {/* Date */}
          <div className="lg:col-span-3 flex items-center space-x-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-500 hover:text-slate-800 underline whitespace-nowrap"
              >
                All Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Receipt # & Date</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-3 text-center">Token & Visit</th>
                <th className="py-3 px-4 text-right">Fee Charged</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-center">Mode</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading receipts...
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold font-mono text-slate-900">{p.receiptNumber}</div>
                      <div className="text-[11px] text-slate-400">{p.paymentDate}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono text-teal-800 font-semibold">{p.uhid}</span> &bull; {p.mobileNumber}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded text-[11px] border border-teal-100">
                        Token #{p.tokenNumber}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.visitNumber}</div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-600 font-semibold whitespace-nowrap">
                      ₹{p.amountCharged.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-800 text-sm whitespace-nowrap">
                      ₹{p.amountPaid.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          p.paymentMode === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.paymentMode === 'UPI'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {p.paymentMode === 'CASH' ? <Banknote className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                        <span>{p.paymentMode}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {p.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      ) : p.paymentStatus === 'PARTIAL' ? (
                        <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          Due: ₹{p.balancePending.toFixed(0)}
                        </span>
                      ) : (
                        <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handlePrintReceipt(p.id)}
                        className="bg-slate-50 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg inline-flex items-center space-x-1 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No payment receipts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search || modeFilter || statusFilter
                        ? 'Try clearing your filters.'
                        : 'Click "Record Fee Payment" to collect a consultation fee.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} receipts)
            </div>
            <div className="flex space-x-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPayments(pagination.page - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPayments(pagination.page + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Visit Selector Modal for "Record Fee Payment" */}
      {isVisitSelectorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#102a43] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">Select Patient Visit to Bill</h3>
              <button
                onClick={() => setIsVisitSelectorOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 mb-3">
                Select a patient currently registered in today&apos;s queue to collect consultation fees:
              </p>

              {visitsLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                  Loading queue...
                </div>
              ) : activeVisits.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {activeVisits.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleSelectVisit(v)}
                      className="p-3 hover:bg-teal-50/60 cursor-pointer transition flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                          #{v.token_number}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{v.full_name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {v.uhid} &bull; {v.visit_type} &bull; {v.status}
                          </p>
                        </div>
                      </div>

                      <span className="bg-teal-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-md">
                        Bill Fee &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No visits found in today&apos;s queue. Register a patient first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Entry Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        visit={selectedVisitForPayment}
        onSuccess={handlePaymentSuccess}
      />

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={selectedReceipt}
      />
    </div>
  );
}

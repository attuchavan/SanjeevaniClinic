import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Calendar,
  Printer,
  FileText,
  Clock,
  User,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import consultationService from '../../services/consultationService';
import PrintablePrescriptionModal from '../../components/consultation/PrintablePrescriptionModal';
import PrintableCasePaperModal from '../../components/consultation/PrintableCasePaperModal';

export default function PrescriptionsArchivePage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modals state
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedCasePaper, setSelectedCasePaper] = useState(null);
  const [isCasePaperModalOpen, setIsCasePaperModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchPrescriptions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await consultationService.listPrescriptions({
        search: search.trim(),
        date: dateFilter || undefined,
        page,
        limit: 15,
      });
      setPrescriptions(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load prescriptions archive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrescriptions(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, dateFilter]);

  const handlePrintPrescription = async (visitId) => {
    setModalLoading(true);
    try {
      const res = await consultationService.getPrintablePrescription(visitId);
      setSelectedPrescription(res.data);
      setIsPrescriptionModalOpen(true);
    } catch (err) {
      alert('Failed to load prescription printable layout');
    } finally {
      setModalLoading(false);
    }
  };

  const handlePrintCasePaper = async (visitId) => {
    setModalLoading(true);
    try {
      const res = await consultationService.getPrintableCasePaper(visitId);
      setSelectedCasePaper(res.data);
      setIsCasePaperModalOpen(true);
    } catch (err) {
      alert('Failed to load case paper printable layout');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-teal-700" />
            <span>Prescription Records & Archive</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Search past prescriptions, review medication histories, and re-print clinic Rx documents
          </p>
        </div>

        <button
          onClick={() => fetchPrescriptions(pagination.page)}
          className="self-start sm:self-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name, UHID, visit #, diagnosis, or medicine name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-4 flex items-center space-x-2">
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Archive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4">Visit Date & Token</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-4">Diagnosis</th>
                <th className="py-3 px-3 text-center">Medicines</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading prescription archives...
                  </td>
                </tr>
              ) : prescriptions.length > 0 ? (
                prescriptions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{pr.visitDate}</div>
                      <div className="text-[11px] text-teal-700 font-semibold">
                        Token #{pr.tokenNumber} • <span className="text-slate-400 font-mono">{pr.visitNumber}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{pr.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono text-teal-800 font-semibold">{pr.uhid}</span> • {pr.age || '—'} Y, {pr.gender}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {pr.diagnosisSummary || 'General Consultation'}
                      </div>
                      {pr.adviceNotes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {pr.adviceNotes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-block bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded text-[11px] border border-teal-100">
                        {pr.medicineCount} Rx
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {pr.isFinalized ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Finalized
                        </span>
                      ) : (
                        <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          Draft
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handlePrintPrescription(pr.visitId)}
                        disabled={modalLoading}
                        className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center space-x-1 transition border border-teal-200"
                        title="Print Prescription"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Rx</span>
                      </button>

                      <button
                        onClick={() => handlePrintCasePaper(pr.visitId)}
                        disabled={modalLoading}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center space-x-1 transition border border-slate-200"
                        title="Print Case Paper"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Case Paper</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No prescriptions found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search || dateFilter ? 'Try clearing your search query or filter.' : 'Finalized prescriptions will appear here.'}
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
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total)
            </div>
            <div className="flex space-x-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPrescriptions(pagination.page - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPrescriptions(pagination.page + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PrintablePrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        data={selectedPrescription}
      />

      <PrintableCasePaperModal
        isOpen={isCasePaperModalOpen}
        onClose={() => setIsCasePaperModalOpen(false)}
        data={selectedCasePaper}
      />
    </div>
  );
}

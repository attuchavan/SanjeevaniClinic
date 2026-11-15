import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Calendar, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  FileText,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

export default function PatientDirectory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isReceptionist = user?.role === 'RECEPTIONIST';
  const basePath = isReceptionist ? '/receptionist/patients' : '/doctor/patients';

  const fetchPatients = async (query = '', page = 1) => {
    try {
      setLoading(true);
      setError('');
      const data = await patientService.searchPatients(query, page, 15);
      setPatients(data.patients || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setError('Unable to load patient records from local database.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPatients(searchQuery, 1);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(searchQuery, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPatients(searchQuery, newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#102a43] flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <span>Patient Directory</span>
            </h1>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
              {pagination.total} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search across permanent records by UHID, patient name, or 10-digit mobile number.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by UHID, Name, or Mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* New Patient Button (Only for Receptionist) */}
          {isReceptionist && (
            <Link
              to="/receptionist/patients/new"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex-shrink-0"
            >
              <UserPlus className="w-4 h-4 text-sky-400" />
              <span>Register Patient</span>
            </Link>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#102a43] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Searching SQLite database records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 font-medium">{error}</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No patient records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No patients matching "${searchQuery}". Try searching by phone number or UHID.`
                : 'No patients registered in the database yet. Click "Register Patient" to add one.'}
            </p>
            {isReceptionist && !searchQuery && (
              <div className="pt-2">
                <Link
                  to="/receptionist/patients/new"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-[#102a43] text-white text-xs font-semibold rounded-xl"
                >
                  <UserPlus className="w-4 h-4 text-sky-400" />
                  <span>Register First Patient</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Patient UHID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Age / Gender</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4 text-center">Lifetime Visits</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {patients.map((pt) => (
                  <tr
                    key={pt.id}
                    onClick={() => navigate(`${basePath}/${pt.id}`)}
                    className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                  >
                    {/* UHID */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-sky-900">
                      <span className="bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded text-[11px]">
                        {pt.uhid}
                      </span>
                    </td>

                    {/* Name & Allergies preview */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block group-hover:text-sky-700 transition-colors">
                        {pt.full_name}
                      </span>
                      {pt.allergies && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-semibold mt-0.5">
                          <ShieldAlert className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span>Allergies: {pt.allergies}</span>
                        </span>
                      )}
                    </td>

                    {/* Age / Gender */}
                    <td className="py-3.5 px-4 font-medium">
                      {pt.age ? `${pt.age} yrs` : '—'} &bull; <span className="capitalize">{pt.gender.toLowerCase()}</span>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      {pt.mobile_number}
                    </td>

                    {/* Blood Group */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        pt.blood_group && pt.blood_group !== 'UNKNOWN'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {pt.blood_group || 'Unknown'}
                      </span>
                    </td>

                    {/* Lifetime Visits */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                        {pt.total_visits || 0}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <Link
                        to={`${basePath}/${pt.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#102a43] bg-slate-100 hover:bg-[#102a43] hover:text-white transition-all shadow-sm"
                      >
                        <span>Profile & History</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (Total {pagination.total} patients)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


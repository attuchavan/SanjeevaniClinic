import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from '../components/common/ChangePasswordModal';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Calendar, 
  CreditCard, 
  Activity, 
  LogOut, 
  KeyRound, 
  Wifi, 
  LayoutDashboard,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function ReceptionistLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Reception Dashboard', path: '/receptionist', icon: LayoutDashboard, end: true },
    { name: 'Live Queue Monitor', path: '/receptionist/queue', icon: Clock },
    { name: 'Register New Patient', path: '/receptionist/patients/new', icon: UserPlus },
    { name: 'Patient Directory', path: '/receptionist/patients', icon: Users },
    { name: 'Appointments', path: '/receptionist/appointments', icon: Calendar },
    { name: 'Billing & Collections', path: '/receptionist/billing', icon: CreditCard },
    { name: 'LAN & System Health', path: '/receptionist/diagnostics', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#102a43] text-white shadow-md border-b border-navy-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-500/20 p-2 rounded-xl border border-sky-400/30 text-sky-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white">SANJEEVANI CLINIC</span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  RECEPTION DESK
                </span>
              </div>
              <p className="text-xs text-sky-200/70">
                Front Office Terminal &bull; Dr. Sharad Motugade
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Socket Status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Doctor Station Connected</span>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 bg-navy-800/80 px-3 py-1.5 rounded-xl border border-navy-700/60">
              <div className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-200 font-bold text-xs flex items-center justify-center">
                RC
              </div>
              <span className="text-xs font-medium text-slate-200 hidden md:inline">
                {user?.fullName || 'Reception Desk'}
              </span>
            </div>

            {/* Change Password */}
            <button
              onClick={() => setPasswordModalOpen(true)}
              title="Change Account Password"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-lg border border-rose-500/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 sticky top-20 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Front Office Operations
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#102a43] text-white shadow-sm shadow-navy-900/10'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 mt-4 border-t border-slate-100 px-3">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Role:</span> Clinic Receptionist
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-700">Permissions:</span> Registration, Queue, Billing
              </div>
            </div>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}


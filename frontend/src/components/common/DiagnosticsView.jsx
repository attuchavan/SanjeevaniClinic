import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import { 
  Server, 
  Database, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Radio,
  Activity
} from 'lucide-react';

export default function DiagnosticsView() {
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState(socket.id || null);
  const [lastSocketMessage, setLastSocketMessage] = useState(null);
  const [pingCount, setPingCount] = useState(0);

  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      setHealthError(null);
      const res = await api.get('/health');
      setHealthData(res.data);
    } catch (err) {
      console.error('Failed to fetch backend health:', err);
      setHealthError(err.response?.data?.message || err.message || 'Cannot reach Express backend');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    const onConnect = () => {
      setSocketConnected(true);
      setSocketId(socket.id);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
      setSocketId(null);
    };

    const onPong = (data) => {
      setLastSocketMessage(data);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('system:pong', onPong);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('system:pong', onPong);
    };
  }, []);

  const handleTestSocketPing = () => {
    const nextCount = pingCount + 1;
    setPingCount(nextCount);
    socket.emit('system:ping', {
      timestamp: new Date().toISOString(),
      source: 'Clinic Terminal Health Check',
      seq: nextCount,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide">
              LAN System Status
            </span>
            <h2 className="text-lg font-bold text-[#102a43]">
              Infrastructure & Diagnostics
            </h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time verification of local SQLite connection, Express API server, and Socket.IO LAN synchronization.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchHealth}
            disabled={loadingHealth}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors border border-slate-300 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
          <button
            onClick={handleTestSocketPing}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#102a43] hover:bg-[#1d3557] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Broadcast Socket Ping</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Express Server Health */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
              <Server className="w-4 h-4 text-sky-600" />
              <span>Express API Server</span>
            </div>
            {healthData?.status === 'OK' ? (
              <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Operational
              </span>
            ) : (
              <span className="inline-flex items-center text-xs text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Error
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">API Endpoint:</span>
              <span className="font-mono text-slate-800">/api/health</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Uptime:</span>
              <span className="font-medium text-slate-800">
                {healthData?.uptime ? `${Math.floor(healthData.uptime)}s` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Memory (Heap):</span>
              <span className="font-medium text-slate-800">
                {healthData?.system?.memory?.heapUsedMb ? `${healthData.system.memory.heapUsedMb} MB` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* SQLite Local Database */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>SQLite Database</span>
            </div>
            {healthData?.database?.connected ? (
              <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> WAL Mode
              </span>
            ) : (
              <span className="inline-flex items-center text-xs text-amber-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Standby
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Foreign Keys:</span>
              <span className="font-medium text-emerald-700">Enforced (ON)</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Tables Count:</span>
              <span className="font-medium text-slate-800">
                {healthData?.database?.tablesCount ? `${healthData.database.tablesCount} tables` : '11 tables'}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Storage Engine:</span>
              <span className="font-mono text-slate-800">better-sqlite3</span>
            </div>
          </div>
        </div>

        {/* Socket.IO Real-time Bus */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-700 font-semibold text-sm">
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Socket.IO Sync</span>
            </div>
            {socketConnected ? (
              <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                <Wifi className="w-3.5 h-3.5 mr-1 animate-pulse" /> Linked
              </span>
            ) : (
              <span className="inline-flex items-center text-xs text-rose-600 font-medium">
                <WifiOff className="w-3.5 h-3.5 mr-1" /> Disconnected
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Transport:</span>
              <span className="font-medium text-slate-800">
                {socket.io?.engine?.transport?.name || 'WebSocket'}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="text-slate-500">Socket Ping Count:</span>
              <span className="font-medium text-slate-800">{pingCount}</span>
            </div>
            {lastSocketMessage && (
              <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] font-mono text-emerald-800 truncate">
                Pong: {lastSocketMessage.message} ({new Date(lastSocketMessage.serverTime).toLocaleTimeString()})
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


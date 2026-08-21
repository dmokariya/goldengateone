import React from 'react';
import { ExecutionMode } from '../types';
import { Zap, Server, Sliders, Code2, BookOpen, Activity, Play, Pause, ShieldCheck, AlertCircle, ShieldAlert } from 'lucide-react';

export type AppTab = 'DASHBOARD' | 'CANDLE_CHART' | 'LIVE_SIGNALS' | 'BACKTEST' | 'STRATEGIES' | 'ZERODHA_BRIDGE';

interface HeaderProps {
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  isEngineActive: boolean;
  setIsEngineActive: (active: boolean) => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  currentLatency: string;
  isZerodhaConnected: boolean;
  onOpenQuickTrade: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  executionMode,
  setExecutionMode,
  isEngineActive,
  setIsEngineActive,
  activeTab,
  setActiveTab,
  currentLatency,
  isZerodhaConnected,
  onOpenQuickTrade
}) => {
  const isLiveKite = executionMode === 'ZERODHA_KITE';

  return (
    <header className="border-b border-[#1F2937] pb-3 mb-5 bg-[#0A0B0E]/95 backdrop-blur sticky top-0 z-30 space-y-2">
      {/* High-Contrast Live Capital Warning vs Paper Simulation Banner */}
      <div className={`px-4 py-1.5 rounded text-xs font-mono font-bold flex items-center justify-between transition-all ${
        isLiveKite
          ? 'bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border border-red-500/60 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse'
          : 'bg-[#111827] border border-amber-500/40 text-amber-300'
      }`}>
        <div className="flex items-center space-x-2">
          {isLiveKite ? (
            <span className="flex items-center space-x-1.5 text-red-300 font-extrabold tracking-wide">
              <ShieldAlert className="w-4 h-4 text-red-400 fill-red-500/30" />
              <span>⚡ LIVE REAL-MONEY MODE ACTIVE — ROUTING DIRECTLY TO ZERODHA KITE CONNECT v3</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 text-amber-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>📄 PAPER SIMULATION MODE — ZERO CAPITAL RISK • SUB-MICROSECOND QUANT ENGINE</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-gray-400 font-normal">Switch Engine:</span>
          <button
            onClick={() => setExecutionMode(isLiveKite ? 'HFT_SIM' : 'ZERODHA_KITE')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border transition-all ${
              isLiveKite
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30'
            }`}
          >
            {isLiveKite ? 'SWITCH TO PAPER SIM' : 'SWITCH TO LIVE KITE'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#3B82F6] flex items-center justify-center rounded-sm rotate-45 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <div className="w-4 h-4 bg-[#0A0B0E]"></div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-widest text-white font-mono">
                QUANTUM-X <span className="text-[#3B82F6]">HFT</span>
              </h1>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-semibold border ${
                isLiveKite
                  ? 'bg-red-500/20 text-red-400 border-red-500/50'
                  : 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30'
              }`}>
                {executionMode === 'HFT_SIM' ? 'MICROSECOND HFT' : executionMode === 'ZERODHA_KITE' ? 'ZERODHA KITE REST' : 'BACKTEST ENGINE'}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-mono">
              Proprietary Execution Engine / v2.4.1 — Sub-Microsecond Quant Architecture
            </p>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <div className="flex flex-wrap items-center bg-[#111827] border border-[#1F2937] p-1 rounded-sm text-xs font-mono gap-1">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-all ${
              activeTab === 'DASHBOARD'
                ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>COCKPIT</span>
          </button>

          <button
            onClick={() => setActiveTab('CANDLE_CHART')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-all ${
              activeTab === 'CANDLE_CHART'
                ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>1M/5M CHART</span>
          </button>

          <button
            onClick={() => setActiveTab('LIVE_SIGNALS')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-all ${
              activeTab === 'LIVE_SIGNALS'
                ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>F&O SIGNALS</span>
          </button>

          <button
            onClick={() => setActiveTab('BACKTEST')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-all ${
              activeTab === 'BACKTEST'
                ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#10B981]" />
            <span>SOLID BACKTEST</span>
          </button>

          <button
            onClick={() => setActiveTab('STRATEGIES')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-all ${
              activeTab === 'STRATEGIES'
                ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>STRATEGIES</span>
          </button>

          <button
            onClick={() => setActiveTab('ZERODHA_BRIDGE')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm transition-all ${
              activeTab === 'ZERODHA_BRIDGE'
                ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZERODHA BRIDGE</span>
          </button>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center space-x-3">
          {/* Quick Manual Order Button */}
          <button
            onClick={onOpenQuickTrade}
            className="flex items-center space-x-1 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40 px-3 py-1.5 rounded-sm text-xs font-mono font-bold transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-[#10B981]" />
            <span>MANUAL ORDER</span>
          </button>

          {/* Engine Start/Stop toggle */}
          <button
            onClick={() => setIsEngineActive(!isEngineActive)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-bold border transition-all ${
              isEngineActive
                ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/30'
                : 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/30'
            }`}
          >
            {isEngineActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isEngineActive ? 'PAUSE TICKER' : 'RESUME STREAM'}</span>
          </button>

          {/* Mode Selector */}
          <div className="hidden xl:flex items-center space-x-2 bg-[#111827] border border-[#1F2937] px-2 py-1 rounded-sm text-[11px] font-mono">
            <span className="text-gray-400">MODE:</span>
            <select
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="HFT_SIM" className="bg-[#111827] text-white">Paper HFT Sim (426μs)</option>
              <option value="ZERODHA_KITE" className="bg-[#111827] text-white">⚡ Zerodha Live API (~120ms)</option>
              <option value="BACKTEST" className="bg-[#111827] text-white">Historical Backtest Mode</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 border-l border-[#1F2937] pl-4 font-mono">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">Status</span>
              <span className={`text-[11px] font-bold ${isZerodhaConnected ? 'text-[#10B981]' : 'text-amber-400'}`}>
                {isZerodhaConnected ? 'CONNECTED: ZERODHA_PRO' : 'SIMULATED_MOCK'}
              </span>
            </div>

            <div className="flex flex-col items-end border-l border-[#1F2937] pl-4">
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">Latency</span>
              <span className="text-xs font-bold text-[#3B82F6]">
                {currentLatency}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


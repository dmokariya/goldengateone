import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, ShieldCheck, Zap, X, ChevronUp, ChevronDown } from 'lucide-react';

interface LiveTradingCornerIndicatorProps {
  tradingMode: 'LIVE' | 'SHADOW';
  onSwitchToShadow: () => void;
  zerodhaUser?: string;
  isZerodhaConnected: boolean;
  activePositionsCount: number;
}

export const LiveTradingCornerIndicator: React.FC<LiveTradingCornerIndicatorProps> = ({
  tradingMode,
  onSwitchToShadow,
  zerodhaUser,
  isZerodhaConnected,
  activePositionsCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tradingMode !== 'LIVE') return null;

  return (
    <div
      id="live-trading-corner-caution"
      className="fixed bottom-5 right-5 z-50 font-mono text-xs select-none max-w-sm"
    >
      {/* Floating Yellow Blinking Caution Card */}
      <div className="bg-[#181204] border-2 border-yellow-400 text-yellow-300 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md ring-4 ring-yellow-400/30 animate-in fade-in slide-in-from-bottom-5 duration-300">
        
        {/* Top Pulsing Caution Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black px-3.5 py-2 flex items-center justify-between cursor-pointer font-black shadow-md hover:brightness-105 transition-all"
        >
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-90"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-700 border border-white"></span>
            </span>
            <AlertTriangle className="w-4 h-4 text-black animate-bounce shrink-0" />
            <span className="tracking-wider uppercase text-[11px]">
              ⚠️ CAUTION: LIVE TRADING ACTIVE
            </span>
          </div>

          <button
            type="button"
            className="p-0.5 rounded hover:bg-black/10 transition-colors ml-2"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-3 space-y-2.5 bg-[#120D02]/95">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-yellow-200 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping inline-block mr-1" />
              <span>Real Margin / Live Capital</span>
            </span>
            <span className="bg-red-950 text-rose-300 border border-rose-500/60 font-black px-1.5 py-0.5 rounded text-[9.5px]">
              REAL MONEY
            </span>
          </div>

          <p className="text-[11px] text-yellow-100 leading-snug">
            All orders are routed directly to <strong className="text-white underline">Zerodha Kite</strong> with real money.
          </p>

          {/* Account Status */}
          <div className="bg-[#1C1505] p-2 rounded border border-yellow-500/30 text-[10.5px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Account:</span>
              <span className="text-white font-bold font-mono">
                {zerodhaUser ? `ID: ${zerodhaUser}` : 'Kite Connected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Open Live Positions:</span>
              <span className="text-emerald-400 font-extrabold font-mono">
                {activePositionsCount} Active
              </span>
            </div>
          </div>

          {/* Quick Safety Revert Button */}
          <button
            onClick={onSwitchToShadow}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-3 rounded text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-lg border border-emerald-300 active:scale-95 transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-200" />
            <span>Switch to Safe Shadow (Paper)</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        </div>

      </div>
    </div>
  );
};

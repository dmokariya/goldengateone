import React from 'react';
import { AlertOctagon, ShieldAlert, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface LiveTradingCautionBannerProps {
  tradingMode: 'LIVE' | 'SHADOW';
  onSwitchToShadow: () => void;
  zerodhaUser?: string;
  isZerodhaConnected: boolean;
}

export const LiveTradingCautionBanner: React.FC<LiveTradingCautionBannerProps> = ({
  tradingMode,
  onSwitchToShadow,
  zerodhaUser,
  isZerodhaConnected
}) => {
  if (tradingMode !== 'LIVE') return null;

  return (
    <div
      id="live-trading-caution-banner"
      className="bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-b-2 border-rose-500 shadow-2xl px-3 sm:px-6 py-2.5 sm:py-3 text-white transition-all animate-in fade-in slide-in-from-top duration-300 relative z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Left Section: Pulsing Live Indicator & Explicit Warning Message */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-4 h-4 rounded-full bg-rose-500 animate-ping absolute opacity-75" />
            <div className="w-4 h-4 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg relative">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="bg-rose-600 text-white font-black text-[10.5px] sm:text-xs uppercase tracking-wider px-2 py-0.5 rounded shadow flex items-center space-x-1 border border-rose-400">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>⚠️ CAUTION: LIVE REAL TRADING ACTIVE</span>
              </span>

              {isZerodhaConnected ? (
                <span className="bg-rose-950/80 text-rose-200 border border-rose-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Kite Account: {zerodhaUser || 'Authenticated'}</span>
                </span>
              ) : (
                <span className="bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  ⚠️ Kite Access Token Required for Execution
                </span>
              )}
            </div>

            <p className="text-xs sm:text-[12.5px] text-rose-100 mt-1 font-medium leading-snug">
              <strong className="text-white font-black uppercase">Real Capital & Live Margin at Risk:</strong>{' '}
              All buy/sell clicks and Auto-Trader actions execute <span className="underline decoration-rose-400 font-bold">real market orders</span> on your Zerodha account with actual money and live slippage.
            </p>
          </div>
        </div>

        {/* Right Section: One-Click Quick Safety Switch Button */}
        <div className="flex items-center space-x-2 shrink-0 self-stretch sm:self-auto justify-end">
          <button
            onClick={onSwitchToShadow}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded text-xs uppercase tracking-wider shadow-lg border border-emerald-300 hover:scale-[1.02] active:scale-95 transition-all"
            title="Switch to zero-risk Paper Trading mode (Shadow Sandbox)"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-100" />
            <span>Switch to Safe Sandbox (Shadow Mode)</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        </div>

      </div>
    </div>
  );
};

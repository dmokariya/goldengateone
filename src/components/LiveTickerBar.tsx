import React from 'react';
import { RefreshCw, Radio, Zap, ShieldCheck } from 'lucide-react';

interface LiveTickerBarProps {
  quotes: Record<string, { lastPrice: number; changePct: number; netChange: number }>;
  isFetchingQuotes: boolean;
  isZerodhaConnected: boolean;
  onFetchLiveQuotes: () => void;
  autoSync: boolean;
  onToggleAutoSync: () => void;
  lastSyncTime: string;
  quoteSource: string;
  onUserActionFeedback?: (msg: string) => void;
}

export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({
  quotes,
  isFetchingQuotes,
  isZerodhaConnected,
  onFetchLiveQuotes,
  autoSync,
  onToggleAutoSync,
  lastSyncTime,
  quoteSource,
  onUserActionFeedback
}) => {
  const triggerFeedback = (msg: string) => {
    if (onUserActionFeedback) onUserActionFeedback(msg);
  };

  const tickerItems = (Object.entries(quotes) as [string, { lastPrice: number; changePct: number; netChange: number }][])
    .filter(([symbol]) => !symbol.includes('26AUG'));

  return (
    <div className="bg-[#0D1117] border-b border-[#1F2937] py-2 px-4 font-mono text-xs flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
      {/* Ticker Controls & Source Badge */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-1.5 bg-[#161B22] px-2.5 py-1 rounded border border-[#30363D]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            {quoteSource === 'ZERODHA_KITE_LIVE' ? 'ZERODHA LIVE FEED' : 'REALTIME TICKER FEED'}
          </span>
        </div>

        {/* Fetch Live Quotes Button */}
        <button
          onClick={() => {
            triggerFeedback('Requested instant live quote refresh from Zerodha API...');
            onFetchLiveQuotes();
          }}
          disabled={isFetchingQuotes}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1 rounded text-[11px] flex items-center space-x-1.5 shadow transition-all active:scale-95 border border-emerald-400/30 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuotes ? 'animate-spin' : ''}`} />
          <span>FETCH LIVE ZERODHA QUOTES</span>
        </button>

        {/* Auto Sync Toggle */}
        <label className="flex items-center space-x-1.5 cursor-pointer text-[10px] text-gray-300 select-none bg-[#161B22] px-2 py-1 rounded border border-[#30363D]">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={() => {
              const next = !autoSync;
              onToggleAutoSync();
              triggerFeedback(next ? 'Enabled 5s auto-sync live prices from Zerodha' : 'Disabled auto-sync');
            }}
            className="rounded border-gray-700 text-emerald-600 focus:ring-0 w-3 h-3 cursor-pointer"
          />
          <span className="font-bold">AUTO-SYNC (5s)</span>
        </label>
      </div>

      {/* Ticker Scroller Marquee */}
      <div className="overflow-hidden whitespace-nowrap w-full max-w-2xl bg-[#161B22]/80 border border-[#30363D] rounded py-1 px-3 relative">
        <div className="inline-flex space-x-6 animate-marquee hover:[animation-play-state:paused]">
          {tickerItems.concat(tickerItems).map(([symbol, data], idx) => {
            const isPos = data.changePct >= 0;
            return (
              <div key={`${symbol}-${idx}`} className="inline-flex items-center space-x-2 text-[11px]">
                <span className="text-gray-300 font-bold">{symbol}:</span>
                <span className="text-white font-extrabold">₹{data.lastPrice.toFixed(2)}</span>
                <span
                  className={`font-bold text-[10px] px-1 py-0.2 rounded ${
                    isPos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {isPos ? '+' : ''}{data.changePct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Sync Timestamp */}
      <div className="text-[10px] text-gray-400 shrink-0 hidden lg:block">
        Last Sync: <span className="text-emerald-400 font-bold">{lastSyncTime || 'LIVE'}</span>
      </div>
    </div>
  );
};

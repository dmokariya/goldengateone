import React from 'react';
import { Zap, ChevronRight, Layers, TrendingUp } from 'lucide-react';

interface QuickSelectRibbonProps {
  selectedContractSymbol: string;
  onSelectContract: (symbol: string) => void;
  onTriggerFeedback?: (message: string) => void;
}

export const QuickSelectRibbon: React.FC<QuickSelectRibbonProps> = ({
  selectedContractSymbol,
  onSelectContract,
  onTriggerFeedback
}) => {
  const quickItems = [
    { sym: 'NIFTY26AUG24650CE', label: '⚠️ 24650 CE (OTM ₹18)', type: 'CAS', desc: 'Far OTM Call Option' },
    { sym: 'NIFTY26AUG24600CE', label: '🟢 24600 CE (ATM ₹48)', type: 'CE', desc: 'ATM Call Option' },
    { sym: 'NIFTY26AUG24500CE', label: '🟢 24500 CE (ITM ₹112)', type: 'CE', desc: 'Deep ITM Call' },
    { sym: 'NIFTY26AUG24500PE', label: '🔴 24500 PE (OTM ₹22)', type: 'PE', desc: 'Counter-Trend Put' },
    { sym: 'RELIANCE', label: '⚡ RELIANCE (89%)', type: 'EQ', desc: 'Direct Equity' },
    { sym: 'TATAMOTORS', label: '⚡ TATAMOTORS (87%)', type: 'EQ', desc: 'Direct Equity' },
    { sym: 'BAJFINANCE', label: '⚡ BAJFINANCE (85%)', type: 'EQ', desc: 'Direct Equity' },
    { sym: 'TCS', label: '⚡ TCS (86%)', type: 'EQ', desc: 'Direct Equity' },
    { sym: 'HDFCBANK', label: '⚡ HDFCBANK (EQ)', type: 'EQ', desc: 'Direct Equity' },
    { sym: 'ICICIBANK', label: '⚡ ICICIBANK (EQ)', type: 'EQ', desc: 'Direct Equity' },
    { sym: 'INFY', label: '⚡ INFY (EQ)', type: 'EQ', desc: 'Direct Equity' }
  ];

  return (
    <div className="bg-[#0D1117] border-2 border-amber-500/40 p-2.5 rounded-md shadow-xl font-mono text-xs space-y-2">
      <div className="flex items-center justify-between text-[10.5px]">
        <span className="font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>PROMINENT QUICK STRIKE & EQUITY SELECTOR</span>
          <span className="bg-amber-400 text-black px-2 py-0.5 rounded text-[9px] font-bold">
            ALWAYS VISIBLE
          </span>
        </span>
        <span className="text-[9.5px] text-gray-400 hidden sm:inline">
          Click any strike or equity to load live Zerodha quote & execute
        </span>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-amber-500/30">
        {quickItems.map((item) => {
          const isSelected = selectedContractSymbol === item.sym;
          return (
            <button
              key={item.sym}
              onClick={() => {
                onSelectContract(item.sym);
                if (onTriggerFeedback) {
                  onTriggerFeedback(`Quick Selected Contract: ${item.sym} (${item.desc})`);
                }
              }}
              className={`shrink-0 px-3 py-1.5 rounded text-[11px] font-extrabold border transition-all flex items-center space-x-1.5 shadow-md ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/60 shadow-blue-500/20 scale-105'
                  : item.type === 'CAS'
                  ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 text-amber-300 border-amber-500/80 hover:bg-amber-900/60'
                  : item.type === 'PE'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/60 hover:bg-rose-900/60'
                  : item.type === 'CE'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900/60'
                  : 'bg-blue-950/60 text-blue-300 border-blue-500/60 hover:bg-blue-900/60'
              }`}
            >
              <span>{item.label}</span>
              {isSelected && <ChevronRight className="w-3.5 h-3.5 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

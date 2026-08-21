import React from 'react';
import { Zap, ShieldCheck, AlertTriangle, X } from 'lucide-react';

interface AutoTraderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  capitalINR: number;
}

export const AutoTraderConfirmModal: React.FC<AutoTraderConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  capitalINR
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 font-mono text-xs">
      <div className="bg-[#0D1117] border-2 border-emerald-500/80 rounded-md w-full max-w-lg shadow-2xl overflow-hidden text-gray-200 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse" />

        {/* Modal Header */}
        <div className="bg-[#161B22] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Selective Profit-Only Auto-Trader
              </h2>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                Takes Trades ONLY With High Exit-In-Profit Confidence (No Forced Orders)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 text-gray-300">
          
          <div className="bg-[#161B22] p-3 rounded border border-emerald-500/40 space-y-2">
            <span className="text-[11px] font-black text-emerald-300 uppercase flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Disciplined AI Profit Mandate</span>
            </span>

            <div className="space-y-2 text-[11px] pt-1">
              <div className="bg-[#0D1117] p-2 rounded border border-emerald-500/30 flex items-center justify-between">
                <span className="text-emerald-400 font-bold">Selective Confidence Gate:</span>
                <span className="font-extrabold text-emerald-300 text-xs">
                  ≥ 85% Win Probability (0% Bad Trades)
                </span>
              </div>

              <div className="bg-[#0D1117] p-2 rounded border border-gray-800 flex items-center justify-between">
                <span className="text-gray-400 font-bold">Capital Allocation:</span>
                <span className="font-extrabold text-emerald-400 text-xs">
                  ₹{capitalINR.toLocaleString('en-IN')} (1 Lakh)
                </span>
              </div>

              <div className="bg-[#0D1117] p-2 rounded border border-gray-800 flex items-center justify-between">
                <span className="text-gray-400 font-bold">Max Concurrent Trades:</span>
                <span className="font-extrabold text-amber-300 text-xs">
                  ⚡ UP TO 3 ORDERS MAX
                </span>
              </div>

              <div className="bg-[#0D1117] p-2 rounded border border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold block">Profit-Exit Automation & Sizing:</span>
                <p className="text-[10px] text-gray-300 leading-normal">
                  • <strong>Strict 85%+ Edge Gate:</strong> Will NEVER take OTM Theta traps, counter-trend setups, or negative EV trades.<br />
                  • <strong>Exchange Lot Alignment:</strong> All NIFTY orders strictly formatted in multiples of 65 (1 Lot = 65 Qty, BankNIFTY = 15).<br />
                  • <strong>Zero Forced Trades:</strong> If market conditions are choppy or confidence is low, Auto-Trader remains in patient observation.<br />
                  • <strong>+5% Profit:</strong> Moves Trailing SL to Break-Even immediately.<br />
                  • <strong>+10% Profit:</strong> Locks in guaranteed +5% profit floor.<br />
                  • <strong>12-Min Theta Guard:</strong> Exits stagnant trades safely.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded text-[10.5px] text-amber-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Orders route directly to your connected Zerodha Kite account only when the quantitative edge is strong. You can pause anytime.
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#161B22] border-t border-gray-800 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded text-xs shadow-lg border border-emerald-300 transition-all uppercase tracking-wider flex items-center space-x-1.5 active:scale-95"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Confirm & Start Auto-Trader</span>
          </button>
        </div>

      </div>
    </div>
  );
};

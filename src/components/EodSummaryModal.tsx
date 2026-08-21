import React from 'react';
import {
  X, CheckCircle2, TrendingUp, TrendingDown, Clock, ShieldCheck,
  Award, BrainCircuit, BarChart2, AlertCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { QuantTradeRecord, analyzeQuantJournal } from '../utils/quantMemory';

interface EodSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalRecords: QuantTradeRecord[];
}

export const EodSummaryModal: React.FC<EodSummaryModalProps> = ({
  isOpen,
  onClose,
  journalRecords
}) => {
  if (!isOpen) return null;

  const quantSummary = analyzeQuantJournal();
  const totalPnL = journalRecords.reduce((acc, r) => acc + r.realizedPnL, 0);
  const winCount = journalRecords.filter((r) => r.result === 'WIN').length;
  const lossCount = journalRecords.filter((r) => r.result === 'LOSS').length;
  const winRate = journalRecords.length > 0 ? ((winCount / journalRecords.length) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 font-mono text-xs">
      <div className="bg-[#0D1117] border-2 border-purple-500/60 rounded-md w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-200 relative">
        
        {/* Top Accent Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 animate-pulse" />

        {/* Modal Header */}
        <div className="bg-[#161B22] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-purple-500/20 text-purple-300 border border-purple-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Daily Exited Trades & EOD Settlement Summary
              </h2>
              <p className="text-[10.5px] text-gray-400 mt-0.5">
                Quant Self-Learning Engine • Entry, Exit & Day-End Market Close Settlement Analysis
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

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          
          {/* Daily Performance Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#161B22] p-3 rounded border border-gray-800 text-center">
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block">Closed Trades</span>
              <span className="text-sm font-black text-white mt-0.5 block">{journalRecords.length}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block">Realized P&L</span>
              <span className={`text-sm font-black mt-0.5 block ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block">Win Rate</span>
              <span className="text-sm font-black text-amber-400 mt-0.5 block">{winRate}% ({winCount}W / {lossCount}L)</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block">Quant Memory Rules</span>
              <span className="text-sm font-black text-purple-300 mt-0.5 block">{quantSummary.learnedRules.length} Active</span>
            </div>
          </div>

          {/* List of Exited Trades */}
          {journalRecords.length === 0 ? (
            <div className="bg-[#161B22] p-8 text-center rounded border border-gray-800 text-gray-400 space-y-2">
              <Clock className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="font-bold text-gray-300">No Exited Trades Logged Today Yet</p>
              <p className="text-[11px] text-gray-400">
                Execute trades and exit via Target, Trailing Stop Loss, or Manual Squareoff to view EOD settlement comparisons and quant learning synthesis.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs font-black uppercase text-white flex items-center space-x-1.5">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span>Trade-by-Trade Execution & EOD Settlement Comparison</span>
              </span>

              {journalRecords.map((trade, idx) => {
                const isWin = trade.result === 'WIN';
                const observedExitPrice = trade.exitPrice;

                const savedMoneyOrMissedGain = isWin
                  ? `📈 DISCIPLINED REALIZED EXIT: Locked in +₹${trade.realizedPnL.toLocaleString('en-IN')} (+${trade.realizedPnLPct.toFixed(2)}%) at ₹${observedExitPrice}. Exit rule executed: ${trade.exitReason}.`
                  : `🛡️ RISK PROTECTION: Stopped out at ₹${observedExitPrice} (-${Math.abs(trade.realizedPnLPct).toFixed(2)}%). Exit rule (${trade.exitReason}) protected account capital.`;

                return (
                  <div
                    key={trade.id || idx}
                    className="bg-[#161B22] border border-gray-800 rounded p-3.5 space-y-3 shadow hover:border-gray-700 transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-white text-xs">{trade.symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          trade.direction === 'BUY' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                        }`}>
                          {trade.direction} • {trade.quantity} QTY
                        </span>
                      </div>

                      <div className="text-right flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isWin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {isWin ? '🟢 WIN' : '🔴 LOSS'} ({trade.realizedPnL >= 0 ? '+' : ''}₹{trade.realizedPnL.toLocaleString('en-IN')})
                        </span>
                      </div>
                    </div>

                    {/* Entry, Exit & Trade Duration Price Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-[#0D1117] p-2.5 rounded border border-gray-800 text-center">
                      <div>
                        <span className="text-[8.5px] text-gray-400 uppercase block font-bold">Entered At</span>
                        <span className="text-xs font-bold text-white mt-0.5 block">₹{trade.entryPrice.toFixed(2)}</span>
                        <span className="text-[8.5px] text-gray-400 block">{trade.openedAtTime}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-amber-400 uppercase block font-bold">Exited At</span>
                        <span className="text-xs font-bold text-amber-300 mt-0.5 block">₹{trade.exitPrice.toFixed(2)}</span>
                        <span className="text-[8.5px] text-amber-300/80 block">{trade.closedAtTime}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] text-purple-400 uppercase block font-bold">Exit Execution Rule</span>
                        <span className="text-xs font-bold text-purple-200 mt-0.5 block">{trade.exitReason}</span>
                        <span className="text-[8.5px] text-purple-300/80 block">{trade.holdingTimeMins || 0} mins holding</span>
                      </div>
                    </div>

                    {/* EOD Analysis & Quant Memory Lesson */}
                    <div className="bg-[#0D1117] p-2.5 rounded border border-purple-500/30 space-y-1.5 text-[10.5px]">
                      <div className="text-gray-200 font-sans leading-relaxed">
                        {savedMoneyOrMissedGain}
                      </div>
                      <div className="text-purple-300 font-mono text-[9.5px] flex items-center space-x-1 pt-1 border-t border-gray-800">
                        <BrainCircuit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Quant Memory Rule: {trade.lessonLearned}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quant Engine Learned Rules Synthesis */}
          <div className="bg-[#161B22] p-3.5 rounded border border-purple-500/40 space-y-2">
            <span className="font-extrabold text-white uppercase text-xs flex items-center space-x-1.5">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              <span>Quant Engine Synthesized Rules in Memory</span>
            </span>
            <div className="space-y-1.5">
              {quantSummary.learnedRules.map((rule, idx) => (
                <div key={idx} className="bg-[#0D1117] p-2 rounded border border-gray-800 text-[10.5px] text-purple-200 font-mono">
                  {rule}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#161B22] border-t border-gray-800 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            Lessons automatically updated in Quant Memory for future win-rate scoring.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs transition-colors"
          >
            Close Summary
          </button>
        </div>

      </div>
    </div>
  );
};

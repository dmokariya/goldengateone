import React, { useState, useEffect } from 'react';
import { getQuantTradeJournal, analyzeQuantJournal, clearQuantTradeJournal, QuantTradeRecord, QuantLearningSummary } from '../utils/quantMemory';
import { Brain, Clock, X, Trash2, Award, FileText, Layers, BarChart2 } from 'lucide-react';

interface QuantLearningJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuantLearningJournalModal: React.FC<QuantLearningJournalModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'MEMORY' | 'EOD_SUMMARY'>('MEMORY');
  const [journal, setJournal] = useState<QuantTradeRecord[]>([]);
  const [summary, setSummary] = useState<QuantLearningSummary | null>(null);

  const refreshData = () => {
    const j = getQuantTradeJournal();
    const s = analyzeQuantJournal();
    setJournal(j);
    setSummary(s);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 font-mono">
      <div className="bg-[#0D1117] border-2 border-amber-500/60 rounded-md w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/80 via-[#161B22] to-amber-950/80 p-4 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-400 rounded">
              <Brain className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center space-x-2">
                <span>QUANT AI MEMORY & EXITED TRADES JOURNAL</span>
                <span className="bg-amber-400 text-black px-2 py-0.5 rounded text-[9px] font-bold">LIVE MEMORY</span>
              </h2>
              <p className="text-[10.5px] text-amber-200/80">
                Continuous trade logging, EOD settlement comparison & self-learning memory engine.
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

        {/* Tab Navigation */}
        <div className="bg-[#161B22] border-b border-gray-800 px-4 flex items-center space-x-2 text-xs pt-2">
          <button
            onClick={() => setActiveTab('MEMORY')}
            className={`px-4 py-2 font-black rounded-t flex items-center space-x-2 border-t-2 border-x transition-all uppercase tracking-wider ${
              activeTab === 'MEMORY'
                ? 'bg-[#0D1117] border-amber-500 text-amber-300 border-b-transparent'
                : 'bg-transparent border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span>🧠 Quant Learning Rules & Journal ({journal.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EOD_SUMMARY')}
            className={`px-4 py-2 font-black rounded-t flex items-center space-x-2 border-t-2 border-x transition-all uppercase tracking-wider ${
              activeTab === 'EOD_SUMMARY'
                ? 'bg-[#0D1117] border-purple-500 text-purple-300 border-b-transparent'
                : 'bg-transparent border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>📅 Daily Exited Trades & EOD Settlement</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-gray-300">

          {activeTab === 'MEMORY' && (
            <>
              {/* Quant Engine Performance Metrics Grid */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#161B22] p-3 rounded border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Total Closed Trades</div>
                    <div className="text-lg font-black text-white mt-1">{summary.totalTrades}</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">{summary.winningTrades} Wins / {summary.losingTrades} Losses</div>
                  </div>

                  <div className="bg-[#161B22] p-3 rounded border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Quant Win Rate</div>
                    <div className={`text-lg font-black mt-1 ${summary.winRatePct >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {summary.winRatePct}%
                    </div>
                    <div className="text-[9px] text-emerald-400/80 mt-0.5">Target & TSL Precision</div>
                  </div>

                  <div className="bg-[#161B22] p-3 rounded border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Total Realized P&L</div>
                    <div className={`text-lg font-black mt-1 ${summary.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{summary.totalRealizedPnL.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">Net Realized Capital</div>
                  </div>

                  <div className="bg-[#161B22] p-3 rounded border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Auto Risk Exits</div>
                    <div className="text-lg font-black text-amber-300 mt-1">
                      {summary.tslExitCount + summary.timeStopExitCount}
                    </div>
                    <div className="text-[9px] text-amber-200/80 mt-0.5">{summary.tslExitCount} TSL / {summary.timeStopExitCount} Time-Stops</div>
                  </div>
                </div>
              )}

              {/* AI Self-Learned Rules Panel */}
              {summary && summary.learnedRules.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="font-extrabold text-amber-300 uppercase flex items-center space-x-1.5 text-xs">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>QUANT ALGORITHM LEARNED RULES & ADAPTIVE RULES</span>
                    </span>
                    <span className="text-[9.5px] bg-black text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded">
                      AUTO-UPDATED ON EVERY TRADE EXIT
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {summary.learnedRules.map((rule, idx) => (
                      <div key={idx} className="bg-black/50 p-2 rounded border border-amber-500/20 text-[11px] leading-relaxed text-amber-100 flex items-start space-x-2">
                        <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade History Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-xs flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Historical Trade Executions Log ({journal.length})</span>
                  </span>

                  {journal.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear all quant trade memory and journal records?')) {
                          clearQuantTradeJournal();
                          refreshData();
                        }
                      }}
                      className="text-[10px] bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded border border-rose-500/40 flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Memory Journal</span>
                    </button>
                  )}
                </div>

                {journal.length === 0 ? (
                  <div className="bg-[#161B22] p-6 rounded border border-gray-800 text-center text-gray-500">
                    <p className="font-bold">No closed trades recorded in memory yet.</p>
                    <p className="text-[10.5px] text-gray-500 mt-1">
                      When you execute and close trades (or when Trailing Stop Loss / Time-Stops exit), detailed outcomes will be logged here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-800 rounded bg-[#161B22]">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#0D1117] text-gray-400 uppercase text-[9.5px] border-b border-gray-800">
                        <tr>
                          <th className="p-2.5">Symbol</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Entry / Exit</th>
                          <th className="p-2.5">PnL (₹)</th>
                          <th className="p-2.5">Exit Reason</th>
                          <th className="p-2.5">Learned Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {journal.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                            <td className="p-2.5 font-bold text-white">
                              {item.symbol}
                              <div className="text-[9px] text-gray-500 font-normal">{item.openedAtTime} - {item.closedAtTime}</div>
                            </td>
                            <td className="p-2.5 font-bold">
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] ${
                                item.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {item.direction}
                              </span>
                            </td>
                            <td className="p-2.5 text-gray-300">
                              ₹{item.entryPrice.toFixed(2)} → ₹{item.exitPrice.toFixed(2)}
                            </td>
                            <td className={`p-2.5 font-bold ${item.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.realizedPnL >= 0 ? '+' : ''}₹{item.realizedPnL.toFixed(2)} ({item.realizedPnLPct.toFixed(1)}%)
                            </td>
                            <td className="p-2.5 text-gray-400">
                              <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[9.5px] text-amber-200">
                                {item.exitReason}
                              </span>
                            </td>
                            <td className="p-2.5 text-[10px] text-gray-300">
                              {item.lessonLearned}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'EOD_SUMMARY' && (
            <div className="space-y-4">
              {/* Daily Exited Trades & EOD Settlement Comparison */}
              <div className="bg-[#161B22] p-3.5 rounded border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="font-extrabold text-white uppercase text-xs flex items-center space-x-1.5">
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                    <span>Daily Exited Trades vs 3:30 PM EOD Market Close Settlement</span>
                  </span>
                  <span className="text-[9.5px] bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
                    EOD ANALYSIS ENGINE
                  </span>
                </div>

                {journal.length === 0 ? (
                  <div className="bg-[#0D1117] p-8 text-center rounded border border-gray-800 text-gray-400 space-y-2">
                    <Clock className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="font-bold text-gray-300">No Exited Trades Logged Today Yet</p>
                    <p className="text-[11px] text-gray-400">
                      Execute trades and exit via Target, Trailing Stop Loss, or Manual Squareoff to view EOD settlement comparisons here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {journal.map((trade, idx) => {
                      const isWin = trade.result === 'WIN';
                      const observedExitPrice = trade.exitPrice;
                      const savedMoneyOrMissedGain = isWin
                        ? `📈 DISCIPLINED REALIZED EXIT: Locked in +₹${trade.realizedPnL.toLocaleString('en-IN')} (+${trade.realizedPnLPct.toFixed(2)}%) at ₹${observedExitPrice}. Exit rule executed: ${trade.exitReason}.`
                        : `🛡️ RISK PROTECTION: Stopped out at ₹${observedExitPrice} (-${Math.abs(trade.realizedPnLPct).toFixed(2)}%). Exit rule (${trade.exitReason}) contained capital loss.`;

                      return (
                        <div
                          key={trade.id || idx}
                          className="bg-[#0D1117] border border-gray-800 rounded p-3.5 space-y-3 shadow hover:border-gray-700 transition-colors"
                        >
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

                          <div className="grid grid-cols-3 gap-2 bg-[#161B22] p-2.5 rounded border border-gray-800 text-center">
                            <div>
                              <span className="text-[8.5px] text-gray-400 uppercase block font-bold">Entered At</span>
                              <span className="text-xs font-bold text-white mt-0.5 block">₹{trade.entryPrice.toFixed(2)}</span>
                              <span className="text-[8.5px] text-gray-400 block">{trade.openedAtTime}</span>
                            </div>
                            <div>
                              <span className="text-[8.5px] text-amber-400 uppercase block font-bold">Exited At</span>
                              <span className="text-xs font-bold text-amber-300 mt-0.5 block">₹{trade.exitPrice.toFixed(2)}</span>
                              <span className="text-[8.5px] text-amber-300/80 block">{trade.closedAtTime} ({trade.exitReason})</span>
                            </div>
                            <div>
                              <span className="text-[8.5px] text-purple-400 uppercase block font-bold">Exit Execution Rule</span>
                              <span className="text-xs font-bold text-purple-200 mt-0.5 block">{trade.exitReason}</span>
                              <span className="text-[8.5px] text-purple-300/80 block">{trade.holdingTimeMins || 0} mins holding</span>
                            </div>
                          </div>

                          <div className="bg-[#161B22] p-2.5 rounded border border-purple-500/30 space-y-1.5 text-[10.5px]">
                            <div className="text-gray-200 font-sans leading-relaxed">
                              {savedMoneyOrMissedGain}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161B22] border-t border-gray-800 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">
            Memory file: <code>localStorage (goldengate_quant_trade_journal)</code>
          </span>
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-1.5 rounded uppercase tracking-wider text-[11px]"
          >
            Close Journal
          </button>
        </div>

      </div>
    </div>
  );
};

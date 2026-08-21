import React, { useState } from 'react';
import { TradingStrategy } from '../types';
import { Sliders, Play, Pause, Plus, ShieldCheck, TrendingUp, RotateCcw } from 'lucide-react';

interface StrategyBuilderProps {
  strategies: TradingStrategy[];
  onToggleStrategy: (id: string) => void;
  onAddStrategy: (newStrat: TradingStrategy) => void;
  onRunBacktest: (id: string) => void;
  onAiGeneratedData?: (data: any) => void;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  strategies,
  onToggleStrategy,
  onAddStrategy,
  onRunBacktest,
  onAiGeneratedData
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [triggerCondition, setTriggerCondition] = useState('');
  const [maxPositionSize, setMaxPositionSize] = useState(1000);
  const [stopLossPct, setStopLossPct] = useState(0.1);
  const [takeProfitPct, setTakeProfitPct] = useState(0.3);

  const handleAiAutoGenerate = async () => {
    setIsAiGenerating(true);
    setAiStatusMessage('AI Signal Engine reading live indicators, options delta, and orderbook imbalance...');

    try {
      const res = await fetch('/api/ai/read-signals-and-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'NIFTY 50',
          timeframe: '5m',
          marketTrend: 'BULLISH_ORDERFLOW'
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAiStatusMessage('Gemini AI read signals successfully! Generated strategies, backtest, and trade recommendations.');
        if (onAiGeneratedData) {
          onAiGeneratedData(json.data);
        }
      } else {
        setAiStatusMessage('Failed to generate strategies from AI signals.');
      }
    } catch (err: any) {
      setAiStatusMessage(`AI Engine Error: ${err.message || 'Server unreachable'}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !triggerCondition) return;

    const newStrat: TradingStrategy = {
      id: `strat-${Date.now()}`,
      name,
      description: 'Custom user defined algorithmic rule.',
      triggerCondition,
      timeframeMs: 100,
      maxPositionSize,
      stopLossPct,
      takeProfitPct,
      status: 'ACTIVE',
      winCount: 0,
      lossCount: 0,
      totalPnL: 0
    };

    onAddStrategy(newStrat);
    setShowNewModal(false);
    setName('');
    setTriggerCondition('');
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#D1D5DB]">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-sm relative overflow-hidden flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#8B5CF6] flex items-center justify-center rounded-xs rotate-45">
            <Sliders className="w-4 h-4 text-[#0A0B0E] -rotate-45 font-bold" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-widest uppercase">
              Algorithmic Strategy Builder & Backtest Engine
            </h2>
            <p className="text-[11px] text-gray-400">
              Configure quantitative rules, trigger conditions, stop losses, and run Monte Carlo simulations.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAiAutoGenerate}
            disabled={isAiGenerating}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-md"
          >
            <TrendingUp className={`w-4 h-4 ${isAiGenerating ? 'animate-spin' : ''}`} />
            <span>{isAiGenerating ? 'AI READING SIGNALS...' : 'AI AUTO-GENERATE STRATEGIES'}</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1.5 bg-[#1F2937] hover:bg-[#374151] text-white px-4 py-2 rounded text-xs font-bold transition-all border border-[#374151]"
          >
            <Plus className="w-4 h-4" />
            <span>CUSTOM STRATEGY</span>
          </button>
        </div>
      </div>

      {aiStatusMessage && (
        <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 p-3 rounded text-xs font-mono text-purple-300 flex items-center justify-between">
          <span>{aiStatusMessage}</span>
          <span className="text-[10px] bg-purple-900/50 px-2 py-0.5 rounded text-purple-200 uppercase">Gemini 3.6 Flash Engine</span>
        </div>
      )}

      {/* Strategy Cards Grid */}
      {strategies.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2937] p-12 text-center rounded-sm space-y-4">
          <div className="text-white font-bold text-base">NO STRATEGIES CONFIGURED</div>
          <p className="text-gray-400 text-xs max-w-md mx-auto font-sans leading-relaxed">
            Let Gemini AI read current technical indicators, option greeks, and orderbook signals to automatically generate optimized quantitative strategies for you!
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={handleAiAutoGenerate}
              disabled={isAiGenerating}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded text-xs font-bold transition-all shadow-lg"
            >
              <TrendingUp className={`w-4 h-4 ${isAiGenerating ? 'animate-spin' : ''}`} />
              <span>{isAiGenerating ? 'GEMINI AI READING SIGNALS...' : 'AI AUTO-GENERATE STRATEGIES NOW'}</span>
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center space-x-1.5 bg-[#1F2937] hover:bg-[#374151] text-gray-300 px-4 py-2.5 rounded text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>MANUAL STRATEGY</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strat) => {

          const winRate = strat.winCount + strat.lossCount > 0
            ? Math.round((strat.winCount / (strat.winCount + strat.lossCount)) * 100)
            : 0;

          return (
            <div
              key={strat.id}
              className="bg-[#111827] border border-[#1F2937] p-5 rounded-sm flex flex-col justify-between space-y-4 relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white text-sm font-mono tracking-wide">
                    {strat.name}
                  </h3>
                  <button
                    onClick={() => onToggleStrategy(strat.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      strat.status === 'ACTIVE'
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                        : 'bg-[#1F2937] border-gray-600 text-gray-400'
                    }`}
                  >
                    {strat.status}
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 font-sans leading-relaxed mb-3">
                  {strat.description}
                </p>

                <div className="bg-[#0A0B0E] p-2.5 border border-[#1F2937] rounded text-[10px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trigger Rule:</span>
                    <span className="text-[#3B82F6] font-bold">{strat.triggerCondition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timeframe:</span>
                    <span className="text-white">{strat.timeframeMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Qty / Position:</span>
                    <span className="text-white">{strat.maxPositionSize.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk Parameters:</span>
                    <span className="text-gray-300">SL: -{strat.stopLossPct}% | TP: +{strat.takeProfitPct}%</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="pt-3 border-t border-[#1F2937] flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase">Total Strategy P&L</span>
                  <span className={`font-bold text-sm ${strat.totalPnL >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    ₹{strat.totalPnL.toLocaleString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-gray-400 block text-[9px] uppercase">Win Ratio ({winRate}%)</span>
                  <span className="text-white">
                    {strat.winCount}W / {strat.lossCount}L
                  </span>
                </div>
              </div>

              {/* Backtest Trigger */}
              <button
                onClick={() => onRunBacktest(strat.id)}
                className="w-full bg-[#0A0B0E] hover:bg-[#1F2937] border border-[#1F2937] text-gray-300 py-2 rounded text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Run Monte Carlo Backtest (1,000 trades)</span>
              </button>
            </div>
          );
        })}
        </div>
      )}

      {/* New Strategy Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-sm w-full max-w-md space-y-4 font-mono text-xs">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-[#1F2937] pb-3">
              Create New Quantitative Trading Rule
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-gray-400 uppercase text-[10px] block mb-1">Strategy Name</label>
                <input
                  type="text"
                  placeholder="e.g. NIFTY Option Gamma Scalper"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 uppercase text-[10px] block mb-1">Trigger Condition</label>
                <input
                  type="text"
                  placeholder="e.g. Bid Depth > 75% AND RSI < 30"
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 uppercase text-[10px] block mb-1">Max Position Size</label>
                  <input
                    type="number"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                    className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 uppercase text-[10px] block mb-1">Stop Loss (% Target)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-[#0A0B0E] border border-[#1F2937] text-gray-400 rounded hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded"
                >
                  SAVE & ACTIVATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

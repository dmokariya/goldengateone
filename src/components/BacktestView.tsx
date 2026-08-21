import React, { useState } from 'react';
import { BacktestReport, BacktestTrade, WalkForwardValidationReport } from '../types';
import { TRADABLE_ASSETS, runQuantBacktest } from '../utils/quantEngine';
import { runWalkForwardValidation } from '../utils/walkForwardEngine';
import { Play, TrendingUp, ShieldAlert, Award, FileSpreadsheet, CheckCircle2, XCircle, Activity, AlertTriangle } from 'lucide-react';

export const BacktestView: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(TRADABLE_ASSETS[0].symbol);
  const [timeframe, setTimeframe] = useState<'1m' | '5m'>('5m');
  const [strategyName, setStrategyName] = useState<string>('GoldenGate Multi-Pillar Edge Model');
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [wfReport, setWfReport] = useState<WalkForwardValidationReport | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isWfRunning, setIsWfRunning] = useState(false);
  const [isAiRunning, setIsAiRunning] = useState(false);

  const handleRunBacktest = () => {
    setIsRunning(true);
    setWfReport(null);
    setTimeout(() => {
      const result = runQuantBacktest(strategyName, selectedSymbol, timeframe);
      setReport(result);
      setIsRunning(false);
    }, 600);
  };

  const handleRunWalkForward = () => {
    setIsWfRunning(true);
    setReport(null);
    setTimeout(() => {
      const result = runWalkForwardValidation(strategyName, selectedSymbol, timeframe);
      setWfReport(result);
      setIsWfRunning(false);
    }, 700);
  };

  const handleAiBacktest = async () => {
    setIsAiRunning(true);
    setWfReport(null);
    try {
      const res = await fetch('/api/ai/read-signals-and-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          timeframe: timeframe,
          marketTrend: 'LIVE_SIGNAL_READING'
        })
      });

      const json = await res.json();
      if (json.success && json.data && json.data.backtestReport) {
        setReport(json.data.backtestReport);
      } else {
        setReport(runQuantBacktest(strategyName, selectedSymbol, timeframe));
      }
    } catch {
      setReport(runQuantBacktest(strategyName, selectedSymbol, timeframe));
    } finally {
      setIsAiRunning(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-sm space-y-5 font-mono text-xs text-[#D1D5DB]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-[#10B981]" />
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">
            Quant Backtest Engine (1m & 5m Multi-Period)
          </h3>
        </div>

        <div className="text-[10px] text-gray-400">
          Historical Candle Backtesting • Instant Metric Analytics
        </div>
      </div>

      {/* Backtest Configuration Bar */}
      <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">STRATEGY MODEL</label>
          <select
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="w-full bg-[#111827] border border-[#1F2937] text-white px-3 py-1.5 rounded focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="EMA 9/21 Crossover + RSI Momentum">EMA 9/21 Cross + RSI Filter</option>
            <option value="Supertrend (10,3) + VWAP Breakout">Supertrend + VWAP Breakout</option>
            <option value="5m Intraday Range Breakout">5m Intraday Range Breakout</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 block mb-1">TARGET INSTRUMENT</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full bg-[#111827] border border-[#1F2937] text-white px-3 py-1.5 rounded focus:outline-none focus:border-[#3B82F6]"
          >
            {TRADABLE_ASSETS.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 block mb-1">TIMEFRAME</label>
          <div className="flex bg-[#111827] border border-[#1F2937] p-1 rounded">
            <button
              onClick={() => setTimeframe('1m')}
              className={`flex-1 py-1 rounded text-center text-[10px] ${
                timeframe === '1m' ? 'bg-[#3B82F6] text-white font-bold' : 'text-gray-400'
              }`}
            >
              1 Min
            </button>
            <button
              onClick={() => setTimeframe('5m')}
              className={`flex-1 py-1 rounded text-center text-[10px] ${
                timeframe === '5m' ? 'bg-[#3B82F6] text-white font-bold' : 'text-gray-400'
              }`}
            >
              5 Min
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <button
            onClick={handleRunWalkForward}
            disabled={isWfRunning || isRunning || isAiRunning}
            className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white py-2 px-3 rounded font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md text-xs disabled:opacity-50"
            title="Run Strict Walk-Forward Validation (In-Sample / Out-of-Sample / Forward Test) with Indian F&O slippage & costs"
          >
            <Activity className={`w-3.5 h-3.5 ${isWfRunning ? 'animate-spin' : ''}`} />
            <span>{isWfRunning ? 'Validating...' : 'WALK-FORWARD OOS'}</span>
          </button>

          <button
            onClick={handleAiBacktest}
            disabled={isAiRunning || isRunning || isWfRunning}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-2 px-3 rounded font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md text-xs disabled:opacity-50"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${isAiRunning ? 'animate-spin' : ''}`} />
            <span>{isAiRunning ? 'AI READING...' : 'AI AUTO-BACKTEST'}</span>
          </button>

          <button
            onClick={handleRunBacktest}
            disabled={isRunning || isAiRunning || isWfRunning}
            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white py-2 px-3 rounded font-bold flex items-center justify-center space-x-1.5 transition-transform active:scale-95 disabled:opacity-50 text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Backtesting...' : 'Standard Backtest'}</span>
          </button>
        </div>
      </div>

      {/* Results Overview Metrics */}
      {!report && !wfReport && !isRunning && !isWfRunning && (
        <div className="bg-[#0A0B0E] border border-[#1F2937] p-10 text-center rounded space-y-2">
          <div className="text-gray-300 font-bold text-xs uppercase tracking-wider">Awaiting Backtest or Walk-Forward Validation</div>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            Select your strategy model, target instrument, and timeframe above, then click 'WALK-FORWARD OOS' for rigorous out-of-sample testing or 'Standard Backtest'.
          </p>
        </div>
      )}

      {/* Walk-Forward Validation Report */}
      {wfReport && (
        <div className="space-y-4 border border-teal-500/40 bg-[#0B1520] p-4 rounded">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <span className="font-extrabold text-white text-xs uppercase">
                Walk-Forward Optimization & Out-of-Sample (OOS) Verification
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              wfReport.overallStatus === 'ROBUST_EDGE' ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/50' :
              wfReport.overallStatus === 'BORDERLINE' ? 'bg-amber-900 text-amber-200 border border-amber-500/50' :
              'bg-rose-900 text-rose-200 border border-rose-500/50'
            }`}>
              {wfReport.overallStatus.replace('_', ' ')} • WFE {wfReport.walkForwardEfficiency}%
            </span>
          </div>

          {/* 3 Partition Comparative Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* In-Sample */}
            <div className="bg-[#0D1826] p-3 rounded border border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase font-bold">In-Sample Training (60%)</div>
              <div className="text-sm font-black text-white mt-1">₹{wfReport.inSample.netProfitINR.toLocaleString('en-IN')} Net</div>
              <div className="text-[11px] text-gray-300 mt-1 flex justify-between">
                <span>Win Rate: <strong>{wfReport.inSample.winRatePct}%</strong></span>
                <span>PF: <strong>{wfReport.inSample.profitFactor}</strong></span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>Trades: {wfReport.inSample.totalTrades}</span>
                <span>Max DD: {wfReport.inSample.maxDrawdownPct}%</span>
              </div>
            </div>

            {/* Out-of-Sample */}
            <div className="bg-[#0E202B] p-3 rounded border border-teal-500/40">
              <div className="text-[10px] text-teal-300 uppercase font-bold">Out-of-Sample Testing (20%)</div>
              <div className={`text-sm font-black mt-1 ${wfReport.outOfSample.netProfitINR >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                ₹{wfReport.outOfSample.netProfitINR.toLocaleString('en-IN')} Net
              </div>
              <div className="text-[11px] text-gray-300 mt-1 flex justify-between">
                <span>Win Rate: <strong>{wfReport.outOfSample.winRatePct}%</strong></span>
                <span>PF: <strong>{wfReport.outOfSample.profitFactor}</strong></span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>Trades: {wfReport.outOfSample.totalTrades}</span>
                <span>Max DD: {wfReport.outOfSample.maxDrawdownPct}%</span>
              </div>
            </div>

            {/* Walk-Forward */}
            <div className="bg-[#0A241F] p-3 rounded border border-emerald-500/40">
              <div className="text-[10px] text-emerald-300 uppercase font-bold">Live Walk-Forward (20%)</div>
              <div className={`text-sm font-black mt-1 ${wfReport.walkForward.netProfitINR >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                ₹{wfReport.walkForward.netProfitINR.toLocaleString('en-IN')} Net
              </div>
              <div className="text-[11px] text-gray-300 mt-1 flex justify-between">
                <span>Win Rate: <strong>{wfReport.walkForward.winRatePct}%</strong></span>
                <span>PF: <strong>{wfReport.walkForward.profitFactor}</strong></span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>Trades: {wfReport.walkForward.totalTrades}</span>
                <span>Max DD: {wfReport.walkForward.maxDrawdownPct}%</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-300 bg-black/40 p-2.5 rounded border border-gray-800 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>{wfReport.notes}</p>
          </div>
        </div>
      )}

      {report && (

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9px] text-gray-400 block uppercase">Win Rate</span>
              <span className="text-lg font-bold text-[#10B981]">{report.winRatePct}%</span>
              <span className="text-[9px] text-gray-500 block">
                {report.winningTrades} W / {report.losingTrades} L
              </span>
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9px] text-gray-400 block uppercase">Net Profit (INR)</span>
              <span
                className={`text-lg font-bold ${
                  report.netProfitINR >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}
              >
                ₹{report.netProfitINR.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-gray-500 block">
                Return: {report.netReturnPct}%
              </span>
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9px] text-gray-400 block uppercase">Profit Factor</span>
              <span className="text-lg font-bold text-white">{report.profitFactor}</span>
              <span className="text-[9px] text-gray-500 block">&gt; 1.5 is Solid</span>
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9px] text-gray-400 block uppercase">Max Drawdown</span>
              <span className="text-lg font-bold text-[#EF4444]">{report.maxDrawdownPct}%</span>
              <span className="text-[9px] text-gray-500 block">Low Risk Exposure</span>
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded col-span-2 md:col-span-1">
              <span className="text-[9px] text-gray-400 block uppercase">Sharpe Ratio</span>
              <span className="text-lg font-bold text-[#3B82F6]">{report.sharpeRatio}</span>
              <span className="text-[9px] text-gray-500 block">Risk-Adjusted Gain</span>
            </div>
          </div>

          {/* Detailed Trades Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase">
              <span>Backtest Executed Trades ({report.trades.length})</span>
              <span className="text-[10px] text-gray-500">
                Period: {report.periodDays} Days ({report.timeframe})
              </span>
            </div>

            <div className="bg-[#0A0B0E] border border-[#1F2937] rounded overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#111827] text-gray-400 border-b border-[#1F2937] sticky top-0">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Entry Price</th>
                    <th className="p-2">Exit Price</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2 text-right">P&L (INR)</th>
                    <th className="p-2 text-right">Return %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/50 text-gray-300">
                  {report.trades.map((trade, i) => {
                    const isWin = trade.result === 'WIN';
                    return (
                      <tr key={trade.id} className="hover:bg-[#111827]/60">
                        <td className="p-2 text-gray-500">{i + 1}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              trade.type === 'BUY'
                                ? 'bg-[#10B981]/20 text-[#10B981]'
                                : 'bg-[#EF4444]/20 text-[#EF4444]'
                            }`}
                          >
                            {trade.type}
                          </span>
                        </td>
                        <td className="p-2 font-mono">₹{trade.entryPrice}</td>
                        <td className="p-2 font-mono">₹{trade.exitPrice}</td>
                        <td className="p-2 text-[10px] text-gray-400">{trade.reason}</td>
                        <td
                          className={`p-2 text-right font-bold ${
                            isWin ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isWin ? '+' : ''}₹{trade.pnlINR.toLocaleString('en-IN')}
                        </td>
                        <td
                          className={`p-2 text-right font-bold ${
                            isWin ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isWin ? '+' : ''}
                          {trade.pnlPct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { PerformanceStats, TickDataPoint, ExecutionMode } from '../types';
import { TrendingUp, RefreshCw, Zap, ShieldAlert, Award, Clock } from 'lucide-react';

interface PnLChartProps {
  stats: PerformanceStats;
  tickHistory: TickDataPoint[];
  executionMode: ExecutionMode;
  onResetPnL: () => void;
}

export const PnLChart: React.FC<PnLChartProps> = ({
  stats,
  tickHistory,
  executionMode,
  onResetPnL
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TickDataPoint | null>(null);
  const [timeframe, setTimeframe] = useState<'REALTIME' | '1M' | '5M' | 'SESSION'>('REALTIME');

  // Compute chart path dimensions
  const svgWidth = 500;
  const svgHeight = 180;
  const padding = 20;

  const prices = tickHistory.map((d) => d.pnl);
  const minPnl = prices.length > 0 ? Math.min(...prices) * 0.98 : 0;
  const maxPnl = prices.length > 0 ? Math.max(...prices) * 1.02 : 100;

  const pointsString = tickHistory.length > 0
    ? tickHistory
        .map((point, index) => {
          const x = padding + (index / (tickHistory.length - 1 || 1)) * (svgWidth - padding * 2);
          const y =
            svgHeight -
            padding -
            ((point.pnl - minPnl) / (maxPnl - minPnl || 1)) * (svgHeight - padding * 2);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' L ')
    : `${padding},${svgHeight - padding} L ${svgWidth - padding},${svgHeight - padding}`;

  const areaString = `${pointsString} L ${svgWidth - padding},${svgHeight - padding} L ${padding},${svgHeight - padding} Z`;

  return (
    <div className="bg-[#111827] border border-[#1F2937] p-6 flex flex-col justify-between h-full rounded-sm relative overflow-hidden">
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* Top Header & Net P&L */}
      <div className="flex flex-wrap justify-between items-start gap-4 relative z-10">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-[12px] uppercase text-gray-400 tracking-[0.2em] font-semibold font-mono">
              Net Realized P&L
            </h2>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
              REAL-TIME FEED
            </span>
          </div>

          <div className="flex items-baseline space-x-3">
            <div className="text-4xl sm:text-5xl font-bold text-white font-mono tracking-tight">
              {stats.netPnL >= 0 ? '+' : ''}
              {stats.netPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              <span className="text-lg text-[#10B981] ml-2">INR</span>
            </div>
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 px-3 py-1 rounded-full text-[#10B981] text-[11px] font-bold font-mono">
              +{stats.todayPnLPct}% Today
            </div>
          </div>
        </div>

        {/* Timeframe selector & Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-[#0A0B0E] border border-[#1F2937] p-1 rounded font-mono text-[10px]">
            {(['REALTIME', '1M', '5M', 'SESSION'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-xs transition-colors ${
                  timeframe === tf ? 'bg-[#3B82F6] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={onResetPnL}
            title="Reset P&L Counter"
            className="p-1.5 bg-[#0A0B0E] border border-[#1F2937] text-gray-400 hover:text-white hover:bg-[#1F2937] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="w-full my-4 border border-[#1F2937] relative overflow-hidden bg-[#0a0b0e] rounded-sm p-2 z-10 group">
        <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500 flex items-center space-x-2">
          <TrendingUp className="w-3 h-3 text-[#3B82F6]" />
          <span>MICROSECOND TICK CURVE ({tickHistory.length} TICKS)</span>
        </div>

        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-[#111827]/90 border border-[#3B82F6] px-2 py-1 rounded text-[10px] font-mono text-white z-20 shadow-lg">
            <span>Time: {hoveredPoint.time}</span> | <span className="text-[#10B981]">PnL: ₹{hoveredPoint.pnl.toLocaleString()}</span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-44 stroke-[#3B82F6] fill-none"
        >
          {/* Subtle horizontal grid lines */}
          <line x1="0" y1="40" x2={svgWidth} y2="40" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="90" x2={svgWidth} y2="90" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="140" x2={svgWidth} y2="140" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3 3" />

          {/* Area gradient under path */}
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={`M ${areaString}`} fill="url(#pnlGradient)" stroke="none" />

          {/* Main PnL Line */}
          <path d={`M ${pointsString}`} stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Data Points */}
          {tickHistory.map((pt, idx) => {
            const x = padding + (idx / (tickHistory.length - 1 || 1)) * (svgWidth - padding * 2);
            const y =
              svgHeight -
              padding -
              ((pt.pnl - minPnl) / (maxPnl - minPnl || 1)) * (svgHeight - padding * 2);
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3"
                className="fill-[#3B82F6] hover:r-5 hover:fill-[#10B981] cursor-pointer transition-all"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Key Metric Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1F2937] relative z-10 font-mono">
        <div className="bg-[#0A0B0E] p-2.5 border border-[#1F2937] rounded-xs text-center">
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-center space-x-1 mb-1">
            <Zap className="w-3 h-3 text-[#3B82F6]" />
            <span>Executed Orders</span>
          </div>
          <div className="text-lg font-bold text-white">
            {stats.totalOrders.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#0A0B0E] p-2.5 border border-[#1F2937] rounded-xs text-center">
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-center space-x-1 mb-1">
            <Award className="w-3 h-3 text-[#10B981]" />
            <span>Win Rate</span>
          </div>
          <div className="text-lg font-bold text-[#10B981]">
            {stats.winRate}%
          </div>
        </div>

        <div className="bg-[#0A0B0E] p-2.5 border border-[#1F2937] rounded-xs text-center">
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-center space-x-1 mb-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Avg Execution Latency</span>
          </div>
          <div className="text-lg font-bold text-white">
            {executionMode === 'HFT_SIM' ? '426μs' : '142ms'}
          </div>
        </div>

        <div className="bg-[#0A0B0E] p-2.5 border border-[#1F2937] rounded-xs text-center">
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-center space-x-1 mb-1">
            <ShieldAlert className="w-3 h-3 text-indigo-400" />
            <span>Sharpe / Slippage</span>
          </div>
          <div className="text-lg font-bold text-white">
            {stats.sharpeRatio} <span className="text-[10px] text-gray-400 font-normal">({stats.avgSlippagePct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

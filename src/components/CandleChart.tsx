import React, { useState, useEffect } from 'react';
import { CandleData } from '../types';
import { TRADABLE_ASSETS, generateCandles } from '../utils/quantEngine';
import { BarChart2, Eye, TrendingUp, RefreshCw, Zap } from 'lucide-react';

interface CandleChartProps {
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  onTriggerOrderForSymbol: (symbol: string, price: number, side: 'BUY' | 'SELL') => void;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  selectedSymbol,
  onSelectSymbol,
  onTriggerOrderForSymbol
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m'>('5m');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [showEma, setShowEma] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showRsi, setShowRsi] = useState(true);
  const [showSupertrend, setShowSupertrend] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // Load/re-generate candles whenever symbol or timeframe changes
  useEffect(() => {
    const loaded = generateCandles(selectedSymbol, timeframe, 36);
    setCandles(loaded);
  }, [selectedSymbol, timeframe]);

  const handleRefreshData = () => {
    setCandles(generateCandles(selectedSymbol, timeframe, 36));
  };

  // Dimensions for Chart SVG
  const svgWidth = 720;
  const candleChartHeight = 220;
  const rsiChartHeight = 70;
  const padding = 30;

  const allPrices = candles.flatMap((c) => [c.high, c.low, c.ema9 || c.close, c.ema21 || c.close]);
  const minPrice = Math.min(...(allPrices.length ? allPrices : [100])) * 0.995;
  const maxPrice = Math.max(...(allPrices.length ? allPrices : [110])) * 1.005;

  const getYForPrice = (p: number) => {
    return (
      candleChartHeight -
      padding -
      ((p - minPrice) / (maxPrice - minPrice || 1)) * (candleChartHeight - padding * 2)
    );
  };

  const candleWidth = Math.max(6, (svgWidth - padding * 2) / (candles.length || 1) - 4);

  return (
    <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-sm flex flex-col space-y-4 font-mono text-xs text-[#D1D5DB] relative overflow-hidden">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              Technical Indicator & Candle Chart
            </h3>
          </div>

          <select
            value={selectedSymbol}
            onChange={(e) => onSelectSymbol(e.target.value)}
            className="bg-[#0A0B0E] border border-[#1F2937] text-white text-xs font-mono px-3 py-1 rounded focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            {TRADABLE_ASSETS.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} ({asset.category.split('_')[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Controls: Timeframe & Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <div className="flex bg-[#0A0B0E] border border-[#1F2937] p-1 rounded font-mono">
            <button
              onClick={() => setTimeframe('1m')}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeframe === '1m' ? 'bg-[#3B82F6] text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              1m Candles
            </button>
            <button
              onClick={() => setTimeframe('5m')}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeframe === '5m' ? 'bg-[#3B82F6] text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              5m Candles
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#0A0B0E] border border-[#1F2937] px-2 py-1 rounded">
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                showEma ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40' : 'text-gray-500'
              }`}
            >
              EMA 9/21
            </button>
            <button
              onClick={() => setShowVwap(!showVwap)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                showVwap ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40' : 'text-gray-500'
              }`}
            >
              VWAP
            </button>
            <button
              onClick={() => setShowSupertrend(!showSupertrend)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                showSupertrend ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40' : 'text-gray-500'
              }`}
            >
              Supertrend
            </button>
            <button
              onClick={() => setShowRsi(!showRsi)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                showRsi ? 'bg-purple-400/20 text-purple-400 border border-purple-400/40' : 'text-gray-500'
              }`}
            >
              RSI (14)
            </button>
          </div>

          <button
            onClick={handleRefreshData}
            title="Refresh Candles Feed"
            className="p-1.5 bg-[#0A0B0E] border border-[#1F2937] text-gray-400 hover:text-white rounded"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hover Info Banner */}
      <div className="bg-[#0A0B0E] p-2.5 border border-[#1F2937] rounded flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
        {hoveredCandle ? (
          <div className="flex flex-wrap items-center space-x-4">
            <span className="text-gray-400">Time: <strong className="text-white">{hoveredCandle.time}</strong></span>
            <span>O: <strong className="text-white">{hoveredCandle.open}</strong></span>
            <span>H: <strong className="text-[#10B981]">{hoveredCandle.high}</strong></span>
            <span>L: <strong className="text-[#EF4444]">{hoveredCandle.low}</strong></span>
            <span>C: <strong className="text-white">{hoveredCandle.close}</strong></span>
            {showEma && (
              <>
                <span className="text-[#3B82F6]">EMA9: {hoveredCandle.ema9}</span>
                <span className="text-indigo-400">EMA21: {hoveredCandle.ema21}</span>
              </>
            )}
            {showVwap && <span className="text-amber-400">VWAP: {hoveredCandle.vwap}</span>}
            {showRsi && <span className="text-purple-400">RSI: {hoveredCandle.rsi14}</span>}
          </div>
        ) : (
          <div className="text-gray-500 italic">
            Hover over any candle to inspect technical indicators & price levels...
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button
            onClick={() =>
              onTriggerOrderForSymbol(
                selectedSymbol,
                candles[candles.length - 1]?.close || 100,
                'BUY'
              )
            }
            className="px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded text-[10px] font-bold flex items-center space-x-1"
          >
            <Zap className="w-3 h-3" />
            <span>QUICK BUY @ {candles[candles.length - 1]?.close || ''}</span>
          </button>
        </div>
      </div>

      {/* SVG Candle Chart */}
      <div className="bg-[#0A0B0E] border border-[#1F2937] p-3 rounded-sm relative overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${candleChartHeight + (showRsi ? rsiChartHeight : 0)}`} className="w-full h-auto">
          {/* Horizontal Grid lines */}
          <line x1="0" y1="40" x2={svgWidth} y2="40" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="100" x2={svgWidth} y2="100" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="160" x2={svgWidth} y2="160" stroke="#1F2937" strokeWidth="0.5" strokeDasharray="3 3" />

          {/* Render Candlesticks */}
          {candles.map((candle, idx) => {
            const x = padding + (idx / (candles.length - 1 || 1)) * (svgWidth - padding * 2);
            const yHigh = getYForPrice(candle.high);
            const yLow = getYForPrice(candle.low);
            const yOpen = getYForPrice(candle.open);
            const yClose = getYForPrice(candle.close);

            const isGreen = candle.close >= candle.open;
            const candleTop = Math.min(yOpen, yClose);
            const candleHeight = Math.max(2, Math.abs(yClose - yOpen));

            return (
              <g
                key={idx}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredCandle(candle)}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                {/* High-Low Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={isGreen ? '#10B981' : '#EF4444'}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={candleTop}
                  width={candleWidth}
                  height={candleHeight}
                  fill={isGreen ? '#10B981' : '#EF4444'}
                  rx="1"
                />

                {/* Buy/Sell Signal Marker Overlay */}
                {candle.signal === 'BUY' && (
                  <g transform={`translate(${x - 8}, ${yLow + 12})`}>
                    <polygon points="8,0 16,12 0,12" fill="#10B981" />
                    <text x="8" y="20" fill="#10B981" fontSize="9" fontWeight="bold" textAnchor="middle">
                      BUY
                    </text>
                  </g>
                )}

                {candle.signal === 'SELL' && (
                  <g transform={`translate(${x - 8}, ${yHigh - 18})`}>
                    <polygon points="8,12 16,0 0,0" fill="#EF4444" />
                    <text x="8" y="-4" fill="#EF4444" fontSize="9" fontWeight="bold" textAnchor="middle">
                      SELL
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* EMA 9 Line */}
          {showEma && (
            <polyline
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
              points={candles
                .map((c, idx) => {
                  const x = padding + (idx / (candles.length - 1 || 1)) * (svgWidth - padding * 2);
                  const y = getYForPrice(c.ema9 || c.close);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}

          {/* EMA 21 Line */}
          {showEma && (
            <polyline
              fill="none"
              stroke="#818CF8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              points={candles
                .map((c, idx) => {
                  const x = padding + (idx / (candles.length - 1 || 1)) * (svgWidth - padding * 2);
                  const y = getYForPrice(c.ema21 || c.close);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}

          {/* VWAP Line */}
          {showVwap && (
            <polyline
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.8"
              points={candles
                .map((c, idx) => {
                  const x = padding + (idx / (candles.length - 1 || 1)) * (svgWidth - padding * 2);
                  const y = getYForPrice(c.vwap || c.close);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}

          {/* RSI Sub-Panel */}
          {showRsi && (
            <g transform={`translate(0, ${candleChartHeight + 10})`}>
              <rect x="0" y="0" width={svgWidth} height={rsiChartHeight} fill="#050608" rx="2" stroke="#1F2937" strokeWidth="0.5" />
              <line x1="0" y1={rsiChartHeight * 0.3} x2={svgWidth} y2={rsiChartHeight * 0.3} stroke="#EF4444" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="0" y1={rsiChartHeight * 0.7} x2={svgWidth} y2={rsiChartHeight * 0.7} stroke="#10B981" strokeWidth="0.5" strokeDasharray="2 2" />

              <polyline
                fill="none"
                stroke="#C084FC"
                strokeWidth="1.5"
                points={candles
                  .map((c, idx) => {
                    const x = padding + (idx / (candles.length - 1 || 1)) * (svgWidth - padding * 2);
                    const rsiVal = c.rsi14 || 50;
                    const y = rsiChartHeight - (rsiVal / 100) * rsiChartHeight;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              <text x="10" y="15" fill="#C084FC" fontSize="9" fontWeight="bold">
                RSI (14): {candles[candles.length - 1]?.rsi14}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

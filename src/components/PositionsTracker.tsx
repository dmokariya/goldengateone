import React, { useState } from 'react';
import { ActivePosition, TradeOrder } from '../types';
import { SquareOffNotificationBanner } from './SquareOffNotificationBanner';
import { Briefcase, TrendingUp, TrendingDown, ArrowRightLeft, XCircle, CheckCircle2, History, RefreshCw, Clock, ShieldCheck, Zap, AlertCircle, Shield, Play } from 'lucide-react';

interface PositionsTrackerProps {
  positions: ActivePosition[];
  orders: TradeOrder[];
  quotes: Record<string, { lastPrice: number; changePct: number }>;
  onExitPosition: (position: ActivePosition, customReason?: string) => void;
  onForceRemovePosition?: (position: ActivePosition) => void;
  onRefreshQuotes: () => void;
  isFetchingQuotes: boolean;
  onUpdatePositionParams?: (posId: string, updates: Partial<ActivePosition>) => void;
  onClearAllPositions?: () => void;
  onSyncZerodhaPositions?: () => void;
  isSyncingZerodha?: boolean;
}

export const PositionsTracker: React.FC<PositionsTrackerProps> = ({
  positions,
  orders,
  quotes,
  onExitPosition,
  onForceRemovePosition,
  onRefreshQuotes,
  isFetchingQuotes,
  onUpdatePositionParams,
  onClearAllPositions,
  onSyncZerodhaPositions,
  isSyncingZerodha = false
}) => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'ORDER_HISTORY'>('POSITIONS');
  const [globalTimeStopEnabled, setGlobalTimeStopEnabled] = useState(true);
  const [globalTrailingStopEnabled, setGlobalTrailingStopEnabled] = useState(true);

  // Filter open positions
  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const closedPositions = positions.filter((p) => p.status === 'CLOSED');

  // Calculate live portfolio stats
  let totalInvestedVal = 0;
  let totalUnrealizedPnL = 0;

  openPositions.forEach((pos) => {
    const livePrice = quotes[pos.symbol]?.lastPrice ?? quotes[pos.tradingsymbol]?.lastPrice ?? pos.currentPrice;
    const posVal = pos.entryPrice * pos.quantity;
    totalInvestedVal += posVal;

    const diff = pos.direction === 'BUY' ? livePrice - pos.entryPrice : pos.entryPrice - livePrice;
    const pnl = diff * pos.quantity;
    totalUnrealizedPnL += pnl;
  });

  const totalRealizedPnL = closedPositions.reduce((acc, p) => acc + (p.unrealizedPnL || 0), 0);

  // Simulation test handlers for user to test TSL and Time Stop in real-time
  const handleSimulatePriceChange = (pos: ActivePosition, pctChange: number) => {
    const newPrice = +(pos.currentPrice * (1 + pctChange / 100)).toFixed(2);
    const newHighest = Math.max(pos.highestPriceReached || pos.entryPrice, newPrice);
    const trailPct = pos.trailingDistancePct ?? 5.0;
    const computedTSL = +(newHighest * (1 - trailPct / 100)).toFixed(2);
    const currentTSL = pos.trailingStopLossPrice ?? +(pos.entryPrice * (1 - trailPct / 100)).toFixed(2);
    const updatedTSL = Math.max(currentTSL, computedTSL);

    if (onUpdatePositionParams) {
      onUpdatePositionParams(pos.id, {
        currentPrice: newPrice,
        highestPriceReached: newHighest,
        trailingStopLossPrice: updatedTSL
      });
    }
  };

  const handleSimulateTimePassage = (pos: ActivePosition, minsToAdd: number) => {
    const currentMins = pos.holdingTimeMins || 0;
    const newMins = currentMins + minsToAdd;
    if (onUpdatePositionParams) {
      onUpdatePositionParams(pos.id, {
        holdingTimeMins: newMins,
        openedAtMs: Date.now() - (newMins * 60000)
      });
    }
  };

  const handleExitAllPositions = (reason: string) => {
    openPositions.forEach((pos) => {
      onExitPosition(pos, reason);
    });
  };

  const handleConvertAllToDelivery = () => {
    if (onUpdatePositionParams) {
      openPositions.forEach((pos) => {
        onUpdatePositionParams(pos.id, { product: 'NRML' });
      });
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-sm p-4 md:p-5 space-y-4 shadow-xl font-mono text-xs">
      {/* 3:25 PM Auto Square-off Notification System */}
      <SquareOffNotificationBanner
        openPositions={openPositions}
        onExitAllPositions={handleExitAllPositions}
        onConvertAllToDelivery={handleConvertAllToDelivery}
      />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Zerodha Live Positions & Order Desk</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </h2>
            <p className="text-[10px] text-gray-400">
              Track open holdings, real-time P&L, Dynamic Trailing Stop-Loss & Time-Stop Auto-Exits
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onSyncZerodhaPositions && (
            <button
              onClick={onSyncZerodhaPositions}
              disabled={isSyncingZerodha}
              className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded text-[11px] text-emerald-300 flex items-center space-x-1.5 transition-colors font-bold"
              title="Query Zerodha Kite API for live open positions and orders"
            >
              <Zap className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingZerodha ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingZerodha ? 'SYNCING...' : 'SYNC WITH ZERODHA'}</span>
            </button>
          )}

          {openPositions.length > 0 && onClearAllPositions && (
            <button
              onClick={() => {
                if (window.confirm('Clear all local positions from the tracking desk? This removes local simulated positions.')) {
                  onClearAllPositions();
                }
              }}
              className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 rounded text-[11px] text-red-300 flex items-center space-x-1.5 transition-colors"
              title="Clear all positions from tracking desk"
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">RESET DESK</span>
            </button>
          )}

          <button
            onClick={onRefreshQuotes}
            disabled={isFetchingQuotes}
            className="px-2.5 py-1.5 bg-[#0A0B0E] hover:bg-[#1F2937] border border-[#1F2937] rounded text-[11px] text-gray-300 flex items-center space-x-1.5 transition-colors"
            title="Refresh Live Prices"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isFetchingQuotes ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">REFRESH LTP</span>
          </button>

          <div className="flex bg-[#0A0B0E] border border-[#1F2937] p-0.5 rounded">
            <button
              onClick={() => setActiveTab('POSITIONS')}
              className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-colors ${
                activeTab === 'POSITIONS' ? 'bg-[#3B82F6] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Positions ({openPositions.length})
            </button>
            <button
              onClick={() => setActiveTab('ORDER_HISTORY')}
              className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-colors ${
                activeTab === 'ORDER_HISTORY' ? 'bg-[#3B82F6] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Order History ({orders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Algo Automation Controls Bar */}
      <div className="bg-[#0A0B0E] border border-blue-900/40 p-3 rounded space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2937] pb-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-bold text-white uppercase text-[11px]">Automated Risk & Exit Management Workers</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ● WORKER THREAD ONLINE (3s CYCLE)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
          {/* Toggle 1: Time-Stop Auto Exit Worker */}
          <div className="flex items-center justify-between bg-[#111827] p-2 rounded border border-[#1F2937]">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <span className="font-bold text-gray-200 block">Auto Time-Stop Worker (12 Mins)</span>
                <span className="text-[8.5px] text-gray-400">Exits stagnant positions (-0.8% to +0.8% PnL) to avoid Theta decay</span>
              </div>
            </div>
            <button
              onClick={() => setGlobalTimeStopEnabled(!globalTimeStopEnabled)}
              className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${
                globalTimeStopEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {globalTimeStopEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Toggle 2: Dynamic Trailing Stop Loss */}
          <div className="flex items-center justify-between bg-[#111827] p-2 rounded border border-[#1F2937]">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <div>
                <span className="font-bold text-gray-200 block">Dynamic Trailing Stop-Loss (5% TSL)</span>
                <span className="text-[8.5px] text-gray-400">Ratchets SL upward behind peak price to lock in profits</span>
              </div>
            </div>
            <button
              onClick={() => setGlobalTrailingStopEnabled(!globalTrailingStopEnabled)}
              className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${
                globalTrailingStopEnabled
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {globalTrailingStopEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0A0B0E] p-3 rounded border border-[#1F2937]">
        <div>
          <span className="text-[9.5px] text-gray-500 uppercase block">OPEN POSITIONS</span>
          <span className="text-sm font-bold text-white">{openPositions.length} Contracts</span>
        </div>
        <div>
          <span className="text-[9.5px] text-gray-500 uppercase block">CAPITAL ENGAGED</span>
          <span className="text-sm font-bold text-gray-200">₹{totalInvestedVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-[9.5px] text-gray-500 uppercase block">UNREALIZED P&L</span>
          <span
            className={`text-sm font-bold flex items-center space-x-1 ${
              totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {totalUnrealizedPnL >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>₹{totalUnrealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
        </div>
        <div>
          <span className="text-[9.5px] text-gray-500 uppercase block">REALIZED P&L (TODAY)</span>
          <span
            className={`text-sm font-bold ${
              totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            ₹{totalRealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Content Tab 1: POSITIONS */}
      {activeTab === 'POSITIONS' && (
        <div>
          {openPositions.length === 0 ? (
            <div className="bg-[#0A0B0E] border border-[#1F2937] rounded p-8 text-center space-y-2">
              <XCircle className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-gray-400 font-bold text-xs uppercase">No Active Open Positions</p>
              <p className="text-[10px] text-gray-500 max-w-sm mx-auto">
                Execute trade signals from the Contract Catalog or AI Signal Scanner above to open live positions. Executed positions will appear here with dynamic trailing stop-losses, live timer exit rules, and instant square-off controls.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1F2937] rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0A0B0E] text-gray-400 text-[10px] uppercase border-b border-[#1F2937]">
                    <th className="p-2.5">Symbol</th>
                    <th className="p-2.5">Side & Qty</th>
                    <th className="p-2.5">Entry / Peak Price</th>
                    <th className="p-2.5">Current LTP & P&L</th>
                    <th className="p-2.5">Dynamic Trailing SL (5%)</th>
                    <th className="p-2.5">Time-Stop & Timer (12m)</th>
                    <th className="p-2.5 text-right">Actions / Sim Test</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937] text-[11px]">
                  {openPositions.map((pos) => {
                    const currentLtp = quotes[pos.symbol]?.lastPrice ?? quotes[pos.tradingsymbol]?.lastPrice ?? pos.currentPrice;
                    const priceDiff = pos.direction === 'BUY' ? currentLtp - pos.entryPrice : pos.entryPrice - currentLtp;
                    const pnlVal = priceDiff * pos.quantity;
                    const pnlPct = pos.entryPrice > 0 ? (priceDiff / pos.entryPrice) * 100 : 0;

                    const peakPrice = Math.max(pos.highestPriceReached || pos.entryPrice, currentLtp);
                    const trailPct = pos.trailingDistancePct ?? 5.0;
                    const computedTSL = +(peakPrice * (1 - trailPct / 100)).toFixed(2);
                    const tslPrice = Math.max(pos.trailingStopLossPrice || +(pos.entryPrice * (1 - trailPct / 100)).toFixed(2), computedTSL);

                    const elapsedMins = pos.holdingTimeMins || 0;
                    const maxAllowedMins = pos.maxAllowedMins || 12;
                    const isStagnant = Math.abs(pnlPct) <= 0.8;
                    const isTimeWarning = elapsedMins >= 8 && isStagnant;

                    return (
                      <tr key={pos.id} className="hover:bg-[#1F2937]/30 transition-colors">
                        {/* Symbol */}
                        <td className="p-2.5 font-bold text-white">
                          <div>{pos.symbol}</div>
                          <div className="text-[9px] text-gray-500 font-normal">{pos.tradingsymbol} • {pos.exchange}</div>
                        </td>

                        {/* Side & Qty */}
                        <td className="p-2.5">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                pos.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {pos.direction}
                            </span>
                            <span className="font-bold text-gray-200">{pos.quantity} Qty</span>
                          </div>
                        </td>

                        {/* Entry / Peak Price */}
                        <td className="p-2.5">
                          <div className="font-bold text-gray-300">₹{pos.entryPrice.toFixed(2)}</div>
                          <div className="text-[9.5px] text-emerald-400 font-semibold flex items-center space-x-1">
                            <span>Peak: ₹{peakPrice.toFixed(2)}</span>
                            {peakPrice > pos.entryPrice && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                          </div>
                        </td>

                        {/* Current LTP & P&L */}
                        <td className="p-2.5">
                          <div className="font-bold text-blue-400">₹{currentLtp.toFixed(2)}</div>
                          <div className={`font-extrabold text-[10px] flex items-center space-x-1 ${pnlVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnlVal >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>₹{pnlVal.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                          </div>
                        </td>

                        {/* Dynamic Trailing Stop Loss */}
                        <td className="p-2.5">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1 font-bold text-purple-300">
                              <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>₹{tslPrice.toFixed(2)}</span>
                              <span className="text-[8.5px] text-gray-400">(-{trailPct}%)</span>
                            </div>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border inline-block w-fit ${
                              tslPrice > pos.entryPrice
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}>
                              {tslPrice > pos.entryPrice ? '🟢 PROFIT LOCKED IN' : '🛡️ TSL PROTECTING'}
                            </span>
                          </div>
                        </td>

                        {/* Time-Stop & Timer */}
                        <td className="p-2.5">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1 text-amber-300 font-bold text-[10.5px]">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{elapsedMins}m / {maxAllowedMins}m Limit</span>
                            </div>
                            {/* Holding progress bar */}
                            <div className="w-24 bg-[#0A0B0E] rounded-full h-1.5 overflow-hidden border border-[#1F2937]">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  elapsedMins >= maxAllowedMins ? 'bg-rose-500' : isTimeWarning ? 'bg-amber-400 animate-pulse' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, (elapsedMins / maxAllowedMins) * 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded border inline-block w-fit ${
                              elapsedMins >= maxAllowedMins
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : isTimeWarning
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-gray-800 text-gray-300 border-gray-700'
                            }`}>
                              {elapsedMins >= maxAllowedMins ? '🚨 TIME-STOP BREACHED' : isTimeWarning ? '⚠️ STAGNANT DECAY WARNING' : '⏱️ NORMAL HOLDING'}
                            </span>
                          </div>
                        </td>

                        {/* Actions & Simulation Buttons */}
                        <td className="p-2.5 text-right space-y-1">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => onExitPosition({ ...pos, currentPrice: currentLtp, unrealizedPnL: pnlVal, unrealizedPnLPct: pnlPct }, 'MANUAL_EXIT')}
                              className="bg-red-600/90 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded text-[9.5px] uppercase flex items-center space-x-1 shadow transition-all active:scale-95 border border-red-400/30"
                              title="Send live Square-off order to Zerodha"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>EXIT</span>
                            </button>

                            {onForceRemovePosition && (
                              <button
                                onClick={() => onForceRemovePosition(pos)}
                                className="bg-[#1F2937] hover:bg-[#374151] text-gray-300 hover:text-white font-bold px-1.5 py-1 rounded text-[9px] uppercase flex items-center space-x-0.5 border border-gray-700 transition-colors"
                                title="Closed already in Kite Mobile App? Click to clear from desk"
                              >
                                <XCircle className="w-3 h-3 text-gray-400" />
                                <span className="hidden xl:inline">CLEAR</span>
                              </button>
                            )}
                          </div>

                          {/* Quick Simulation Buttons for TSL & Time Stop Testing */}
                          <div className="flex items-center justify-end space-x-1 text-[8px]">
                            <button
                              onClick={() => handleSimulatePriceChange(pos, 4)}
                              className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold"
                              title="Simulate +4% Price Rise to trigger TSL ratchet up"
                            >
                              +4% TSL ▲
                            </button>
                            <button
                              onClick={() => handleSimulatePriceChange(pos, -6)}
                              className="bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded font-bold"
                              title="Simulate price drop to breach TSL"
                            >
                              -6% Drop ▼
                            </button>
                            <button
                              onClick={() => handleSimulateTimePassage(pos, 5)}
                              className="bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold"
                              title="Simulate +5 Mins passage"
                            >
                              +5m ⏱️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content Tab 2: ORDER HISTORY */}
      {activeTab === 'ORDER_HISTORY' && (
        <div>
          {orders.length === 0 ? (
            <div className="bg-[#0A0B0E] border border-[#1F2937] rounded p-8 text-center space-y-2">
              <History className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-gray-400 font-bold text-xs uppercase">No Order History Yet</p>
              <p className="text-[10px] text-gray-500">
                Executed orders and square-offs will be logged here with complete timestamps and Zerodha execution IDs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1F2937] rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0A0B0E] text-gray-400 text-[10px] uppercase border-b border-[#1F2937]">
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Order ID</th>
                    <th className="p-2.5">Symbol</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Side</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Execution Price</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937] text-[11px]">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#1F2937]/30 transition-colors">
                      <td className="p-2.5 text-gray-400 text-[10px]">{ord.timestamp}</td>
                      <td className="p-2.5 text-blue-400 font-bold text-[10px]">{ord.id}</td>
                      <td className="p-2.5 font-bold text-white">{ord.symbol}</td>
                      <td className="p-2.5 text-gray-400 text-[10px]">{ord.type}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                            ord.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-gray-200">{ord.quantity} Qty</td>
                      <td className="p-2.5 text-emerald-400 font-bold">₹{ord.price.toFixed(2)}</td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            ord.status === 'FILLED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import {
  ZerodhaApiCredentials,
  LiveTradeSignal,
  ExecutionLogItem,
  LogType,
  ActivePosition,
  TradeOrder,
  TradeableContract
} from './types';
import { generateLiveSignals, getOrCreateSignalForSymbol, generateFreshRecalibratedSignal, evaluateContractQuantMetrics, scanGoldenFunnelUniverse } from './utils/quantEngine';
import { recordClosedTradeToJournal, getQuantTradeJournal } from './utils/quantMemory';
import { lookupLiveQuote, calculateRealtimePnL, evaluateRiskGuardianExit } from './utils/quoteLookup';
import { ZerodhaConnectionHeader } from './components/ZerodhaConnectionHeader';
import { ContractCatalog } from './components/ContractCatalog';
import { QuickSelectRibbon } from './components/QuickSelectRibbon';
import { QuantLearningJournalModal } from './components/QuantLearningJournalModal';
import { TradeDetailsModal } from './components/TradeDetailsModal';
import { EodSummaryModal } from './components/EodSummaryModal';
import { AutoTraderConfirmModal } from './components/AutoTraderConfirmModal';
import { EmergencyStopModal } from './components/EmergencyStopModal';
import { LiveSignalsView } from './components/LiveSignalsView';
import { PositionsTracker } from './components/PositionsTracker';
import { OrderExecutionModal } from './components/OrderExecutionModal';
import { ExecutionLogs } from './components/ExecutionLogs';
import { LiveTickerBar } from './components/LiveTickerBar';
import { TradingPerformanceSummary } from './components/TradingPerformanceSummary';
import { ToastContainer, ToastNotification } from './components/ToastContainer';
import { EdgeEngineDashboard } from './components/EdgeEngineDashboard';
import { StrategyResearchLab } from './components/StrategyResearchLab';
import { HelpKnowledgeModal } from './components/HelpKnowledgeModal';
import { DataFilesLogbook } from './components/DataFilesLogbook';
import { LiveTradingCautionBanner } from './components/LiveTradingCautionBanner';
import { LiveTradingCornerIndicator } from './components/LiveTradingCornerIndicator';
import { getDynamicTradeableContracts, DEFAULT_UNDERLYING_SPOTS } from './data/contracts';
import { Zap, Brain, Layers, AlertOctagon, RefreshCw, Home, ShieldAlert, CheckCircle2, ShieldCheck, Sparkles, Scale, FlaskConical, HelpCircle, Database, FileText } from 'lucide-react';

export default function App() {
  // Zerodha API Credentials State
  const [zerodhaCreds, setZerodhaCreds] = useState<ZerodhaApiCredentials>(() => {
    const savedKey = localStorage.getItem('zerodha_api_key') || '';
    const savedSecret = localStorage.getItem('zerodha_api_secret') || '';
    const savedToken = localStorage.getItem('zerodha_access_token') || '';
    const savedUserId = localStorage.getItem('zerodha_user_id') || '';
    const isConnected = localStorage.getItem('zerodha_is_connected') === 'true';

    return {
      apiKey: savedKey,
      apiSecret: savedSecret,
      accessToken: savedToken,
      userLoginId: savedUserId,
      isConnected
    };
  });

  // User UI Feedback Banner State & Multi-Toast Queue State (Appears in Bottom of Browser)
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [userFeedbackMsg, setUserFeedbackMsg] = useState<string | null>(null);

  const addToast = (type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastNotification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
    setToasts((prev) => [...prev.slice(-5), newToast]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const triggerUserFeedback = (msg: string, isError: boolean = false) => {
    setUserFeedbackMsg(msg);
    addToast(isError ? 'ERROR' : 'SUCCESS', isError ? 'Status Alert / Error' : 'Action Performed', msg);
    setTimeout(() => {
      setUserFeedbackMsg((current) => (current === msg ? null : current));
    }, 4500);
  };

  // Selected Option Strike & Contract Catalog State
  const [selectedContractSymbol, setSelectedContractSymbol] = useState<string>('');

  // Live Signals Engine State
  const [liveSignals, setLiveSignals] = useState<LiveTradeSignal[]>(() => generateLiveSignals());

  // Order Execution Modal State
  const [selectedSignalForOrder, setSelectedSignalForOrder] = useState<LiveTradeSignal | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [activeOrderResult, setActiveOrderResult] = useState<{
    symbol: string;
    direction: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    orderId?: string;
    errorMsg?: string;
  } | null>(null);

  // Live Market Quote Engine State (Strict Live Feed Only)
  const [quotes, setQuotes] = useState<Record<string, { lastPrice: number; changePct: number; change?: number; high?: number; low?: number }>>({});
  const [spotIndices, setSpotIndices] = useState<Record<string, number>>({});
  const [isFetchingQuotes, setIsFetchingQuotes] = useState<boolean>(false);
  const [autoSyncQuotes, setAutoSyncQuotes] = useState<boolean>(true);
  const [lastQuoteSyncTime, setLastQuoteSyncTime] = useState<string>('Not Synced');
  const [quoteSource, setQuoteSource] = useState<string>('DISCONNECTED');

  // AI Signal Scanning State
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [logs, setLogs] = useState<ExecutionLogItem[]>([]);

  // Recently Exited, Journal, EOD Summary & Modals State
  const [recentlyExitedSymbols, setRecentlyExitedSymbols] = useState<Record<string, { exitPrice: number; reason: string; exitedAt: string }>>({});
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isEodSummaryModalOpen, setIsEodSummaryModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isDataFilesModalOpen, setIsDataFilesModalOpen] = useState<boolean>(false);
  const [selectedModalSignal, setSelectedModalSignal] = useState<LiveTradeSignal | null>(null);
  const [isTradeDetailsModalOpen, setIsTradeDetailsModalOpen] = useState<boolean>(false);

  // Auto-Trading Engine State (1 Lakh Capital & 3 Concurrent Orders Limit)
  const [isAutoTrading, setIsAutoTrading] = useState<boolean>(false);
  const [isAutoTraderConfirmOpen, setIsAutoTraderConfirmOpen] = useState<boolean>(false);
  const [isEmergencyStopOpen, setIsEmergencyStopOpen] = useState<boolean>(false);
  const [autoTradingCapital, setAutoTradingCapital] = useState<number>(100000); // ₹1,00,000 Allocation
  const [showEdgeEngine, setShowEdgeEngine] = useState<boolean>(false);
  const [showResearchLab, setShowResearchLab] = useState<boolean>(false);

  // Trading Execution Mode: 'SHADOW' (Paper / Sandbox with Real Live Quotes) vs 'LIVE' (Real Zerodha Kite Orders)
  const [tradingMode, setTradingMode] = useState<'SHADOW' | 'LIVE'>(() => {
    return (localStorage.getItem('goldengate_trading_mode') as 'SHADOW' | 'LIVE') || 'SHADOW';
  });

  // Active View Tab: 'SNIPER_HUB' (Default Live Sniper Hub) | 'POSITIONS_ORDERS' | 'QUANT_LAB' (Under blanket) | 'JOURNAL_LOGS'
  const [activeTab, setActiveTab] = useState<'SNIPER_HUB' | 'POSITIONS_ORDERS' | 'QUANT_LAB' | 'JOURNAL_LOGS'>('SNIPER_HUB');

  // Hub Layout Mode: 'SIDE_BY_SIDE' (Side-by-side Universe + Signals) | 'TABS' | 'STACKED'
  const [hubLayoutMode, setHubLayoutMode] = useState<'SIDE_BY_SIDE' | 'TABS' | 'STACKED'>('SIDE_BY_SIDE');
  const [hubSubTab, setHubSubTab] = useState<'CONTRACTS' | 'SIGNALS'>('SIGNALS');

  // Scanner Universe Filter: 'ALL' | 'ALPHA_PICK' | 'TOP_3' | 'TOP_12' | 'NIFTY' | 'BANKNIFTY' | 'STOCKS'
  const [scannerFilter, setScannerFilter] = useState<'ALL' | 'ALPHA_PICK' | 'TOP_3' | 'TOP_12' | 'NIFTY' | 'BANKNIFTY' | 'STOCKS'>('ALL');

  const handleToggleTradingMode = (newMode: 'SHADOW' | 'LIVE') => {
    setTradingMode(newMode);
    localStorage.setItem('goldengate_trading_mode', newMode);
    if (newMode === 'SHADOW') {
      triggerUserFeedback('🟢 Switched to SHADOW MODE: Safe sandbox trading with live market prices. No real capital at risk.');
      addToast('INFO', 'Shadow Sandbox Active', 'Orders will be simulated with real live quotes without touching your Zerodha account funds.');
    } else {
      triggerUserFeedback('🔴 Switched to LIVE MODE: Real orders will be dispatched directly to your Zerodha Kite broker account.');
      addToast('WARNING', 'Live Zerodha Mode Active', 'Real orders will execute on Zerodha Kite API with actual capital.');
    }
  };

  // Positions and Order History State (with Local Storage Persistence)
  const [positions, setPositions] = useState<ActivePosition[]>(() => {
    try {
      const saved = localStorage.getItem('goldengate_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orderHistory, setOrderHistory] = useState<TradeOrder[]>(() => {
    try {
      const saved = localStorage.getItem('goldengate_order_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save Positions & Orders to LocalStorage whenever updated
  useEffect(() => {
    localStorage.setItem('goldengate_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('goldengate_order_history', JSON.stringify(orderHistory));
  }, [orderHistory]);

  // Intercept Zerodha OAuth redirect URL params (?request_token=... or ?access_token=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const reqToken = urlParams.get('request_token');
      const actToken = urlParams.get('access_token');
      const action = urlParams.get('action');

      if (actToken) {
        localStorage.setItem('zerodha_access_token', actToken);
        localStorage.setItem('zerodha_is_connected', 'true');
        setZerodhaCreds((prev) => ({ ...prev, accessToken: actToken, isConnected: true }));
        triggerUserFeedback('✓ Captured Zerodha Access Token from URL!');
        addLog('SYSTEM', 'Zerodha access token captured and saved in browser.');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (reqToken) {
        triggerUserFeedback('🔄 Capturing Zerodha request token & exchanging for live session...');
        addLog('SYSTEM', `Captured request token (${reqToken.substring(0, 6)}...). Exchanging with Kite API...`);

        const key = zerodhaCreds.apiKey || localStorage.getItem('zerodha_api_key') || '';
        const secret = zerodhaCreds.apiSecret || localStorage.getItem('zerodha_api_secret') || '';

        fetch('/api/zerodha/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: key,
            apiSecret: secret,
            requestToken: reqToken
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.accessToken) {
              localStorage.setItem('zerodha_access_token', data.accessToken);
              localStorage.setItem('zerodha_user_id', data.userLoginId || 'ZERODHA_USER');
              localStorage.setItem('zerodha_is_connected', 'true');
              setZerodhaCreds((prev) => ({
                ...prev,
                apiKey: key,
                apiSecret: secret,
                accessToken: data.accessToken,
                userLoginId: data.userLoginId,
                isConnected: true
              }));
              triggerUserFeedback(`✓ Connected to Zerodha Kite! Logged in as ${data.userName || data.userLoginId}`);
              addLog('SYSTEM', `✓ Successfully authenticated with Zerodha Kite! User: ${data.userName || data.userLoginId}`);
            } else {
              triggerUserFeedback(`⚠️ Token exchange failed: ${data.message || 'Check API Key & Secret'}`, true);
              addLog('SYSTEM', `Zerodha token exchange response: ${data.message}`);
            }
          })
          .catch((err) => {
            triggerUserFeedback(`Kite Gateway error: ${err.message}`, true);
          })
          .finally(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  const addLog = (type: LogType, message: string, symbol?: string) => {
    const newLog: ExecutionLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      rawTimeMs: Date.now(),
      type,
      message,
      symbol
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Home / Logo Click Handler: Refresh Terminal Data & Trade Ideas
  const handleHomeRefresh = () => {
    setSelectedContractSymbol('');
    setLiveSignals(generateLiveSignals());
    handleFetchLiveQuotes(true);
    triggerUserFeedback('🏠 Terminal Refreshed: New Live Quotes & Fresh AI Trade Ideas Loaded!');
    addLog('SYSTEM', '🏠 HOME REFRESH: Re-scanned market data and generated fresh trade ideas.');
  };

  // Emergency Kill-Switch Execution Handler
  const handleExecuteEmergencyKillSwitch = () => {
    setIsAutoTrading(false);
    const openPositions = positions.filter((p) => p.status === 'OPEN');
    
    openPositions.forEach((pos) => {
      handleExitPosition(pos, 'EMERGENCY_KILL_SWITCH_SQUAREOFF');
    });

    addLog('SYSTEM', `🚨 EMERGENCY KILL-SWITCH ACTIVATED: Auto-Trader halted and ${openPositions.length} active positions squared off immediately.`);
    triggerUserFeedback(`🚨 EMERGENCY KILL-SWITCH EXECUTED! Disabled Auto-Trader and squared off ${openPositions.length} active positions.`, true);
  };

  // Fetch Live Zerodha Market Quotes
  const handleFetchLiveQuotes = async (isAuto: boolean = false) => {
    if (!isAuto) setIsFetchingQuotes(true);
    try {
      const dynamicUniverse = getDynamicTradeableContracts(spotIndices);
      const symbolsToFetch = Array.from(
        new Set([
          ...dynamicUniverse.map((c) => c.tradingsymbol),
          ...dynamicUniverse.map((c) => c.symbol),
          ...positions.map((p) => p.tradingsymbol),
          ...positions.map((p) => p.symbol),
          ...orderHistory.map((o) => o.tradingsymbol),
          ...orderHistory.map((o) => o.symbol),
          ...liveSignals.map((s) => s.symbol),
          ...liveSignals.map((s) => s.zerodhaPayload?.tradingsymbol)
        ])
      ).filter(Boolean);

      const res = await fetch('/api/zerodha/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: zerodhaCreds.apiKey || '',
          accessToken: zerodhaCreds.accessToken || '',
          instruments: symbolsToFetch
        })
      });

      // Guard against non-JSON or HTML error responses
      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (data && data.success && data.quotes) {
        setQuotes(data.quotes);
        if (data.spotIndices) {
          setSpotIndices(data.spotIndices);
        }
        setQuoteSource(data.source || 'ZERODHA_KITE_LIVE');
        const syncTime = new Date().toLocaleTimeString();
        setLastQuoteSyncTime(syncTime);

        // Update positions with current prices using normalized quote resolver
        setPositions((prev) =>
          prev.map((p) => {
            const q = lookupLiveQuote(p.symbol, p.tradingsymbol, data.quotes);
            if (q && typeof q.lastPrice === 'number' && p.status === 'OPEN') {
              const livePx = q.lastPrice;
              const { pnlVal, pnlPct } = calculateRealtimePnL(p.entryPrice, livePx, p.quantity, p.direction);
              return {
                ...p,
                currentPrice: livePx,
                highestPriceReached: Math.max(p.highestPriceReached || p.entryPrice, livePx),
                unrealizedPnL: pnlVal,
                unrealizedPnLPct: pnlPct
              };
            }
            return p;
          })
        );

        // Update order history with live LTP and unrealized PnL
        setOrderHistory((prev) =>
          prev.map((ord) => {
            const q = lookupLiveQuote(ord.symbol, ord.tradingsymbol, data.quotes);
            if (q && typeof q.lastPrice === 'number') {
              const livePx = q.lastPrice;
              const { pnlVal, pnlPct } = calculateRealtimePnL(ord.price, livePx, ord.quantity, ord.side);
              return {
                ...ord,
                currentLtp: livePx,
                unrealizedPnL: pnlVal,
                unrealizedPnLPct: pnlPct
              };
            }
            return ord;
          })
        );

        // Update liveSignals with real-time LTP & dynamic quant re-evaluation using actual spot indices
        setLiveSignals((prevSignals) =>
          prevSignals.map((sig) => {
            const q = lookupLiveQuote(sig.symbol, sig.zerodhaPayload?.tradingsymbol, data.quotes);
            if (q && typeof q.lastPrice === 'number' && q.lastPrice > 0) {
              const liveLtp = q.lastPrice;
              const evaluated = evaluateContractQuantMetrics(sig.symbol, liveLtp, q, data.spotIndices);
              return {
                ...sig,
                source: 'ZERODHA_KITE_LIVE',
                currentLtp: liveLtp,
                entryPrice: liveLtp,
                targetPrice: evaluated.targetPrice,
                stopLossPrice: evaluated.stopLossPrice,
                winProbabilityPct: evaluated.winProbabilityPct,
                riskRewardRatio: evaluated.riskRewardRatio,
                confidenceLevel: evaluated.confidenceLevel,
                isMustTakeTrade: evaluated.isMustTakeTrade,
                mustTakeReason: evaluated.mustTakeReason,
                isBadTradeWarning: evaluated.isBadTradeWarning,
                badTradeReason: evaluated.badTradeReason,
                isCounterTrend: evaluated.isCounterTrend,
                greeks: evaluated.greeks,
                likelihoodCalculation: evaluated.likelihoodCalculation,
                laymanReason: evaluated.laymanReason,
                spotPriceUsed: evaluated.spotPriceUsed,
                underlyingSymbol: evaluated.underlyingSymbol,
                marketRegime: evaluated.marketRegime,
                zerodhaPayload: sig.zerodhaPayload ? {
                  ...sig.zerodhaPayload,
                  price: liveLtp
                } : undefined
              };
            }
            return sig;
          })
        );

        if (!isAuto) {
          triggerUserFeedback(`Synchronized live Zerodha market quotes! Updated at ${syncTime}.`);
          addLog('SYSTEM', `Quotes updated from ${data.source}`);
        }
      } else if (data && !data.success) {
        setQuoteSource('DISCONNECTED');
        if (!isAuto) {
          triggerUserFeedback(`Market Quote Alert: ${data.message || 'Live Kite feed disconnected'}`, true);
        }
      }
    } catch (err: any) {
      console.warn('Notice while updating market quotes:', err?.message || err);
      setQuoteSource('DISCONNECTED');
      if (!isAuto) {
        triggerUserFeedback(`Quote fetch error: ${err?.message || 'Check connection'}`, true);
      }
    } finally {
      if (!isAuto) setIsFetchingQuotes(false);
    }
  };

  // High-Frequency Auto-Sync Timer (1.2s rapid tick streaming for zero LTP lag)
  useEffect(() => {
    handleFetchLiveQuotes(true);
    if (!autoSyncQuotes) return;

    const interval = setInterval(() => {
      handleFetchLiveQuotes(true);
    }, 1200);

    return () => clearInterval(interval);
  }, [autoSyncQuotes, zerodhaCreds.accessToken, positions.length, orderHistory.length]);

  // Execute Shadow Paper Trade (Zero Risk Sandbox Mode with Live LTP)
  const handleExecuteSignalShadow = async (signal: LiveTradeSignal) => {
    const q = lookupLiveQuote(signal.symbol, signal.zerodhaPayload?.tradingsymbol, quotes);
    const currentLtp = q?.lastPrice ?? signal.currentLtp ?? signal.entryPrice;
    const quantity = signal.zerodhaPayload?.quantity || 25;
    const shadowOrderId = `SHD_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const slPrice = signal.stopLossPrice > 0 ? signal.stopLossPrice : +(signal.direction === 'BUY' ? currentLtp * 0.90 : currentLtp * 1.10).toFixed(2);
    const tgPrice = signal.targetPrice > 0 ? signal.targetPrice : +(signal.direction === 'BUY' ? currentLtp * 1.15 : currentLtp * 0.85).toFixed(2);

    const newOrder: TradeOrder = {
      id: shadowOrderId,
      timestamp,
      symbol: signal.symbol,
      tradingsymbol: signal.zerodhaPayload?.tradingsymbol || signal.symbol,
      type: 'LIMIT',
      side: signal.direction,
      quantity,
      price: currentLtp,
      latencyMs: 12,
      status: 'FILLED',
      mode: 'SHADOW',
      currentLtp: currentLtp,
      unrealizedPnL: 0,
      unrealizedPnLPct: 0
    };

    setOrderHistory((prev) => [newOrder, ...prev]);

    const newPos: ActivePosition = {
      id: `POS_SHD_${Date.now()}`,
      orderId: shadowOrderId,
      symbol: signal.symbol,
      tradingsymbol: signal.zerodhaPayload?.tradingsymbol || signal.symbol,
      exchange: 'NFO',
      direction: signal.direction,
      quantity,
      entryPrice: currentLtp,
      currentPrice: currentLtp,
      highestPriceReached: currentLtp,
      stopLossPrice: slPrice,
      targetPrice: tgPrice,
      trailingStopLossPrice: slPrice,
      trailingDistancePct: 5.0,
      status: 'OPEN',
      unrealizedPnL: 0,
      unrealizedPnLPct: 0,
      timestamp,
      openedAtMs: Date.now(),
      holdingTimeMins: 0,
      maxAllowedMins: 12
    };

    setPositions((prev) => [newPos, ...prev]);
    setTimeout(() => handleFetchLiveQuotes(true), 50);
    triggerUserFeedback(`⚡ Shadow Paper Trade Executed: ${signal.symbol} (${quantity} Qty @ ₹${currentLtp.toFixed(2)})`);
    addToast('SUCCESS', 'Shadow Order Executed', `Simulated Paper Trade for ${signal.symbol} @ ₹${currentLtp.toFixed(2)}`);

    try {
      await fetch('/api/data-files/log-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SHADOW',
          order: newOrder
        })
      });
    } catch {
      // silent
    }
  };

  // 🛡️ CONTINUOUS LIVE RISK GUARDIAN (Monitors ALL Open Positions for SL, TSL, Target, & Time-Stop)
  useEffect(() => {
    const riskInterval = setInterval(() => {
      const openPositions = positions.filter((p) => p.status === 'OPEN');
      if (openPositions.length === 0) return;

      openPositions.forEach((pos) => {
        const q = lookupLiveQuote(pos.symbol, pos.tradingsymbol, quotes);
        const livePrice = q?.lastPrice ?? pos.currentPrice;

        // Calculate holding time
        const holdingMins = pos.openedAtMs ? Math.floor((Date.now() - pos.openedAtMs) / 60000) : (pos.holdingTimeMins || 0);

        const evaluation = evaluateRiskGuardianExit(
          {
            symbol: pos.symbol,
            direction: pos.direction,
            entryPrice: pos.entryPrice,
            currentPrice: livePrice,
            stopLossPrice: pos.stopLossPrice,
            targetPrice: pos.targetPrice,
            trailingStopLossPrice: pos.trailingStopLossPrice,
            highestPriceReached: Math.max(pos.highestPriceReached || pos.entryPrice, livePrice),
            holdingTimeMins: holdingMins,
            maxAllowedMins: pos.maxAllowedMins || 12
          },
          livePrice
        );

        // Update trailing stop loss if adjusted upward
        if (evaluation.suggestedTSL && evaluation.suggestedTSL !== pos.trailingStopLossPrice) {
          setPositions((prev) =>
            prev.map((p) => (p.id === pos.id ? { ...p, trailingStopLossPrice: evaluation.suggestedTSL, holdingTimeMins: holdingMins } : p))
          );
        }

        // Automatic Exit Trigger when Risk Rule is Breached
        if (evaluation.shouldExit && evaluation.exitReason) {
          addLog(
            'SIGNAL',
            `🛡️ [RISK GUARDIAN AUTO-EXIT] ${pos.symbol} (${pos.direction}): ${evaluation.description}`,
            pos.symbol
          );
          addToast(
            evaluation.exitReason === 'TARGET_HIT' ? 'SUCCESS' : 'WARNING',
            `Risk Guardian: ${evaluation.exitReason.replace(/_/g, ' ')}`,
            evaluation.description
          );
          handleExitPosition(pos, evaluation.exitReason);
        }
      });
    }, 2000);

    return () => clearInterval(riskInterval);
  }, [positions, quotes]);

  // 🤖 AUTO-TRADING ENGINE SCANNER (Requires Universal Rule: Live Feed Provenance)
  useEffect(() => {
    if (!isAutoTrading) return;

    const interval = setInterval(() => {
      if (quoteSource !== 'ZERODHA_KITE_LIVE') {
        addLog('SYSTEM', '⛔ AUTO-TRADER HALTED: Universal Rule Active (NO LIVE DATA = NO SIGNAL = NO ORDER). Waiting for Zerodha Kite live feed.');
        return;
      }

      // Selective Auto-Trade Scanning: Max 3 open positions
      const currentOpen = positions.filter((p) => p.status === 'OPEN');
      if (currentOpen.length < 3) {
        const highlyConfidentCandidates = liveSignals.filter((sig) => {
          const isAlreadyOpen = currentOpen.some((p) => p.symbol.toUpperCase() === sig.symbol.toUpperCase());
          const isRecentlyExited = !!recentlyExitedSymbols[sig.symbol];
          const hasPositiveEV = (sig.likelihoodCalculation?.expectedValueINR ?? 0) > 0;
          const isLiveSource = sig.source === 'ZERODHA_KITE_LIVE';
          const isHighConfidence = sig.winProbabilityPct >= 80 && !sig.isBadTradeWarning && !sig.isCounterTrend && hasPositiveEV;
          const isNotDiscarded = sig.status !== 'DISCARDED';
          return isLiveSource && isHighConfidence && !isAlreadyOpen && !isRecentlyExited && isNotDiscarded;
        });

        if (highlyConfidentCandidates.length > 0) {
          highlyConfidentCandidates.sort((a, b) => b.winProbabilityPct - a.winProbabilityPct);
          const topSig = highlyConfidentCandidates[0];
          addLog('SIGNAL', `🤖 AUTO-TRADER (LIVE DATA VALIDATED): Executing ${topSig.symbol} (${topSig.winProbabilityPct}% Win Rate, EV: ₹${topSig.likelihoodCalculation?.expectedValueINR || 0}) [Order ${currentOpen.length + 1}/3]`, topSig.symbol);
          addToast('INFO', 'Auto-Trader Selective Entry', `High profit-confidence signal (≥80%) detected from live feed: ${topSig.symbol} (${topSig.winProbabilityPct}% Win Rate). Routing order to Zerodha...`);
          handleExecuteSignalOnZerodha(topSig);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoTrading, positions, quotes, liveSignals, recentlyExitedSymbols, quoteSource]);


  // Disconnect Zerodha
  const handleDisconnectZerodha = () => {
    localStorage.removeItem('zerodha_access_token');
    localStorage.setItem('zerodha_is_connected', 'false');
    setZerodhaCreds((prev) => ({
      ...prev,
      isConnected: false,
      accessToken: ''
    }));
    addLog('SYSTEM', 'Zerodha Kite session disconnected.');
    triggerUserFeedback('Zerodha Kite session disconnected.');
  };

  // AI Signal Reader
  const handleAiReadSignals = async (contractSymbol: string, category: string) => {
    setIsAiScanning(true);
    addLog('SIGNAL', `AI scanning orderbook signals for ${contractSymbol}...`);
    addToast('INFO', 'AI Market Scan Started', `Scanning order flow & gamma curves for ${contractSymbol}...`);

    try {
      const res = await fetch('/api/ai/read-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedContract: contractSymbol,
          contractType: category
        })
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.signals) && json.signals.length > 0) {
        setLiveSignals(json.signals);
        addLog('SIGNAL', `Loaded ${json.signals.length} high-confidence trade signals.`);
        triggerUserFeedback(`✓ AI Scan Completed: Loaded ${json.signals.length} high-confidence trade signals.`);
      } else {
        setLiveSignals(generateLiveSignals());
        triggerUserFeedback('✓ AI Scan Completed: Refreshed quant trade signals.');
      }
    } catch {
      setLiveSignals(generateLiveSignals());
      triggerUserFeedback('AI Scan fallback: Refreshed quant trade models.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const [isSyncingZerodha, setIsSyncingZerodha] = useState<boolean>(false);

  // Sync Live Positions and Orders directly from Zerodha Kite OMS
  const handleSyncZerodhaPositionsAndOrders = async () => {
    const keyToUse = zerodhaCreds.apiKey || localStorage.getItem('zerodha_api_key') || '';
    const tokenToUse = zerodhaCreds.accessToken || localStorage.getItem('zerodha_access_token') || '';

    if (!keyToUse || !tokenToUse) {
      triggerUserFeedback("Cannot sync: Please click 'LOG IN WITH ZERODHA KITE' to authenticate your session first.", true);
      addToast('WARNING', 'Zerodha Session Disconnected', "Please authenticate with Zerodha Kite in the top bar.");
      return;
    }

    setIsSyncingZerodha(true);
    addToast('INFO', 'Syncing with Zerodha Kite', 'Querying live open positions and order history directly from Zerodha Kite API...');

    try {
      const [posRes, ordRes] = await Promise.all([
        fetch('/api/zerodha/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToUse, accessToken: tokenToUse })
        }),
        fetch('/api/zerodha/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToUse, accessToken: tokenToUse })
        })
      ]);

      let posJson: any = { success: false, net: [] };
      let ordJson: any = { success: false, orders: [] };
      try {
        const posText = await posRes.text();
        posJson = JSON.parse(posText);
      } catch {
        posJson = { success: false, net: [] };
      }
      try {
        const ordText = await ordRes.text();
        ordJson = JSON.parse(ordText);
      } catch {
        ordJson = { success: false, orders: [] };
      }

      if (posJson.success && Array.isArray(posJson.net)) {
        const liveKitePositions: ActivePosition[] = posJson.net
          .filter((p: any) => p.quantity !== 0)
          .map((p: any) => {
            const isBuy = p.quantity > 0;
            const avgP = p.average_price || p.buy_price || p.last_price || 0;
            const currentP = p.last_price || avgP;
            const pnl = p.pnl || p.m2m || ((currentP - avgP) * p.quantity);
            const pnlPct = avgP > 0 ? (pnl / (avgP * Math.abs(p.quantity))) * 100 : 0;

            return {
              id: `pos-${p.tradingsymbol}`,
              orderId: `KITE-${p.instrument_token || Date.now()}`,
              symbol: p.tradingsymbol,
              tradingsymbol: p.tradingsymbol,
              exchange: p.exchange || 'NFO',
              direction: isBuy ? 'BUY' : 'SELL',
              quantity: Math.abs(p.quantity),
              entryPrice: avgP,
              currentPrice: currentP,
              highestPriceReached: currentP,
              lowestPriceReached: currentP,
              trailingStopLossPrice: isBuy ? +(avgP * 0.95).toFixed(2) : +(avgP * 1.05).toFixed(2),
              trailingDistancePct: 5.0,
              targetPrice: isBuy ? +(avgP * 1.15).toFixed(2) : +(avgP * 0.85).toFixed(2),
              stopLossPrice: isBuy ? +(avgP * 0.90).toFixed(2) : +(avgP * 1.10).toFixed(2),
              unrealizedPnL: pnl,
              unrealizedPnLPct: pnlPct,
              timestamp: new Date().toLocaleTimeString(),
              openedAtMs: Date.now(),
              status: 'OPEN',
              expectedTimeHorizon: 'Intraday Live OMS',
              winProbabilityPct: 88,
              holdingTimeMins: 0,
              maxAllowedMins: 15,
              autoTimeStopEnabled: true,
              autoTrailingStopEnabled: true
            };
          });

        setPositions(liveKitePositions);
        localStorage.setItem('goldengate_positions', JSON.stringify(liveKitePositions));

        if (ordJson.success && Array.isArray(ordJson.orders)) {
          const liveOrders: TradeOrder[] = ordJson.orders.map((o: any) => ({
            id: o.order_id,
            symbol: o.tradingsymbol,
            side: o.transaction_type,
            type: o.order_type,
            price: o.price || o.average_price || 0,
            quantity: o.quantity,
            status: o.status === 'COMPLETE' ? 'FILLED' : o.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
            timestamp: o.order_timestamp ? new Date(o.order_timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
            latencyMs: 85
          }));
          setOrderHistory(liveOrders);
          localStorage.setItem('goldengate_order_history', JSON.stringify(liveOrders));
        }

        triggerUserFeedback(`✓ Synced with Zerodha: ${liveKitePositions.length} active position(s) found in Zerodha.`);
        addToast('SUCCESS', 'Zerodha Portfolio Synced', `Found ${liveKitePositions.length} active position(s) in your Zerodha account.`);
        addLog('API_ACK', `Synced live portfolio with Zerodha Kite: ${liveKitePositions.length} open position(s).`);
      } else {
        triggerUserFeedback(`Sync error: ${posJson.message || 'Could not fetch positions'}`, true);
        addToast('ERROR', 'Zerodha Sync Rejection', posJson.message || 'Failed to fetch positions.');
      }
    } catch (err: any) {
      triggerUserFeedback(`Zerodha Sync Error: ${err.message}`, true);
      addToast('ERROR', 'Zerodha Gateway Error', err.message);
    } finally {
      setIsSyncingZerodha(false);
    }
  };

  // Execute Signal on Zerodha
  const handleExecuteSignalOnZerodha = async (signal: LiveTradeSignal) => {
    const cleanSym = signal.symbol.toUpperCase();
    let lotSize = 1;
    if (cleanSym.includes('BANKNIFTY')) lotSize = 15;
    else if (cleanSym.includes('FINNIFTY')) lotSize = 40;
    else if (cleanSym.includes('MIDCPNIFTY')) lotSize = 50;
    else if (cleanSym.includes('SENSEX') || cleanSym.includes('BANKEX')) lotSize = 10;
    else if (cleanSym.includes('NIFTY')) lotSize = 65; // NIFTY lot size: 65

    let rawQty = signal.zerodhaPayload?.quantity ?? lotSize;
    if (lotSize > 1) {
      const numLots = Math.max(1, Math.round(rawQty / lotSize));
      rawQty = numLots * lotSize;
    }
    const qty = rawQty;

    const isOpt = cleanSym.includes('CE') || cleanSym.includes('PE');
    const isBse = cleanSym.includes('SENSEX') || cleanSym.includes('BANKEX');
    const tradingsymbol = signal.zerodhaPayload?.tradingsymbol ?? signal.symbol.replace(/\s+/g, '');
    const exchange = signal.zerodhaPayload?.exchange ?? (isOpt ? (isBse ? 'BFO' : 'NFO') : (isBse ? 'BSE' : 'NSE'));
    const transactionType = signal.zerodhaPayload?.transaction_type ?? signal.direction ?? 'BUY';
    const orderType = signal.zerodhaPayload?.order_type ?? (isOpt ? 'LIMIT' : 'MARKET');
    const product = signal.zerodhaPayload?.product ?? (isOpt ? 'NRML' : 'MIS');

    // SHADOW / PAPER TRADING EXECUTION (Safe Sandbox with Real Live Quotes)
    if (tradingMode === 'SHADOW') {
      const shadowOrderId = `SHADOW-${Date.now().toString(36).toUpperCase()}`;
      setActiveOrderResult({
        orderId: shadowOrderId,
        symbol: signal.symbol,
        direction: transactionType,
        quantity: qty,
        price: signal.entryPrice
      });

      const newOrder: TradeOrder = {
        id: shadowOrderId,
        symbol: signal.symbol,
        side: transactionType,
        type: orderType,
        price: signal.entryPrice,
        quantity: qty,
        status: 'FILLED',
        timestamp: new Date().toLocaleTimeString(),
        latencyMs: 12
      };
      setOrderHistory((prev) => [newOrder, ...prev]);

      // Persist to server data file for permanent auditing
      fetch('/api/data-files/record-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SHADOW',
          orderId: shadowOrderId,
          symbol: signal.symbol,
          tradingsymbol,
          exchange,
          direction: transactionType,
          quantity: qty,
          price: signal.entryPrice,
          orderType,
          product,
          status: 'FILLED',
          latencyMs: 12,
          signalSource: 'GOLDENGATE_QUANT',
          winProbabilityPct: signal.winProbabilityPct,
          netExpectedValueINR: signal.netExpectedValueINR
        })
      }).catch((e) => console.warn('Shadow order file log warning:', e));

      const initialStopLoss = signal.stopLossPrice || +(signal.entryPrice * 0.90).toFixed(2);
      const initialTrailingSL = +(signal.entryPrice * 0.95).toFixed(2);

      const newPos: ActivePosition = {
        id: `pos-${Date.now()}`,
        orderId: shadowOrderId,
        symbol: signal.symbol,
        tradingsymbol,
        exchange,
        direction: transactionType,
        quantity: qty,
        entryPrice: signal.entryPrice,
        currentPrice: signal.entryPrice,
        highestPriceReached: signal.entryPrice,
        lowestPriceReached: signal.entryPrice,
        trailingStopLossPrice: initialTrailingSL,
        trailingDistancePct: 5.0,
        targetPrice: signal.targetPrice,
        stopLossPrice: initialStopLoss,
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
        timestamp: new Date().toLocaleTimeString(),
        openedAtMs: Date.now(),
        status: 'OPEN',
        expectedTimeHorizon: signal.expectedTimeHorizon || '15 - 30 Mins',
        winProbabilityPct: signal.winProbabilityPct || 88,
        holdingTimeMins: 0,
        maxAllowedMins: 12,
        autoTimeStopEnabled: true,
        autoTrailingStopEnabled: true
      };

      setPositions((prev) => [newPos, ...prev.filter((p) => p.symbol !== signal.symbol)]);

      addLog('FILL_BUY', `[🟢 SHADOW SANDBOX] Paper order executed for ${signal.symbol} (${qty} Qty @ ₹${signal.entryPrice}). Zero real money risked.`, signal.symbol);
      triggerUserFeedback(`✓ [SHADOW PAPER TRADING] Executed ${signal.symbol} (${qty} Qty @ ₹${signal.entryPrice}). Order ID: ${shadowOrderId}`);
      addToast('SUCCESS', 'Shadow Order Executed', `[SANDBOX] ${signal.symbol} (${qty} Qty @ ₹${signal.entryPrice}) added to active tracking desk.`);
      setIsOrderModalOpen(true);
      return;
    }

    // LIVE ZERODHA API ORDER EXECUTION
    const keyToUse = zerodhaCreds.apiKey || localStorage.getItem('zerodha_api_key') || '';
    const tokenToUse = zerodhaCreds.accessToken || localStorage.getItem('zerodha_access_token') || '';

    // STRICT CHECK: Disallow order routing and reject immediately if no credentials exist
    if (!keyToUse || !tokenToUse) {
      const authError = "Order not sent: Zerodha Kite session is not connected. Please click 'LOG IN WITH ZERODHA KITE' in the top header or switch to 'SHADOW MODE' to paper trade.";
      setActiveOrderResult({
        symbol: signal.symbol,
        direction: transactionType,
        quantity: qty,
        price: signal.entryPrice,
        errorMsg: authError
      });
      setIsOrderModalOpen(true);
      triggerUserFeedback(authError, true);
      addToast('ERROR', 'Zerodha Session Required', authError);
      addLog('SYSTEM', `ORDER BLOCKED: ${authError}`, signal.symbol);
      return;
    }

    addLog('FILL_BUY', `Routing ${transactionType} order for ${signal.symbol} (${qty} Qty, ${Math.round(qty / lotSize)} Lot${Math.round(qty / lotSize) > 1 ? 's' : ''}) to Zerodha...`, signal.symbol);
    addToast('INFO', 'Order Routing Initiated', `Routing ${transactionType} ${qty} Qty (${Math.round(qty / lotSize)} Lot${Math.round(qty / lotSize) > 1 ? 's' : ''}) of ${signal.symbol} to Zerodha Kite API...`);

    try {
      const res = await fetch('/api/zerodha/execute-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToUse,
          accessToken: tokenToUse,
          tradingsymbol,
          exchange,
          transaction_type: transactionType,
          quantity: qty,
          order_type: orderType,
          product,
          price: signal.entryPrice
        })
      });

      let json: any;
      try {
        const text = await res.text();
        json = JSON.parse(text);
      } catch {
        if (res.status === 403) {
          json = {
            success: false,
            isIpBlocked: true,
            message: `Zerodha IP Whitelist (403): IP 2600:1900:0:3e02::1400 is not whitelisted on your Kite developer console.`
          };
        } else {
          json = {
            success: false,
            message: `Gateway returned status ${res.status} ${res.statusText}. Please verify Kite session.`
          };
        }
      }

      if (json.success && json.orderId) {
        setActiveOrderResult({
          orderId: json.orderId,
          symbol: signal.symbol,
          direction: transactionType,
          quantity: qty,
          price: signal.entryPrice
        });

        const newOrder: TradeOrder = {
          id: json.orderId || `ORD-${Date.now()}`,
          symbol: signal.symbol,
          side: transactionType,
          type: orderType,
          price: signal.entryPrice,
          quantity: qty,
          status: 'FILLED',
          timestamp: new Date().toLocaleTimeString(),
          latencyMs: 120
        };
        setOrderHistory((prev) => [newOrder, ...prev]);

        // Persist to server data file for permanent auditing
        fetch('/api/data-files/record-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'LIVE',
            orderId: json.orderId || `ORD-${Date.now()}`,
            symbol: signal.symbol,
            tradingsymbol,
            exchange,
            direction: transactionType,
            quantity: qty,
            price: signal.entryPrice,
            orderType,
            product,
            status: 'FILLED',
            latencyMs: 120,
            signalSource: 'ZERODHA_KITE_LIVE',
            winProbabilityPct: signal.winProbabilityPct,
            netExpectedValueINR: signal.netExpectedValueINR
          })
        }).catch((e) => console.warn('Live order file log warning:', e));

        // Add Active Position ONLY upon confirmed execution from Zerodha
        const initialStopLoss = signal.stopLossPrice || +(signal.entryPrice * 0.90).toFixed(2);
        const initialTrailingSL = +(signal.entryPrice * 0.95).toFixed(2);

        const newPos: ActivePosition = {
          id: `pos-${Date.now()}`,
          orderId: json.orderId || `ORD-${Date.now()}`,
          symbol: signal.symbol,
          tradingsymbol,
          exchange,
          direction: transactionType,
          quantity: qty,
          entryPrice: signal.entryPrice,
          currentPrice: signal.entryPrice,
          highestPriceReached: signal.entryPrice,
          lowestPriceReached: signal.entryPrice,
          trailingStopLossPrice: initialTrailingSL,
          trailingDistancePct: 5.0,
          targetPrice: signal.targetPrice,
          stopLossPrice: initialStopLoss,
          unrealizedPnL: 0,
          unrealizedPnLPct: 0,
          timestamp: new Date().toLocaleTimeString(),
          openedAtMs: Date.now(),
          status: 'OPEN',
          expectedTimeHorizon: signal.expectedTimeHorizon || '15 - 30 Mins',
          winProbabilityPct: signal.winProbabilityPct || 88,
          holdingTimeMins: 0,
          maxAllowedMins: 12,
          autoTimeStopEnabled: true,
          autoTrailingStopEnabled: true
        };

        setPositions((prev) => [newPos, ...prev.filter((p) => p.symbol !== signal.symbol)]);

        addLog('API_ACK', `ZERODHA ORDER EXECUTED! Order ID: ${json.orderId}. ${signal.symbol} @ ₹${signal.entryPrice}`, signal.symbol);
        triggerUserFeedback(`✓ Order Executed: ${signal.symbol} (${qty} Qty @ ₹${signal.entryPrice}). Order ID: ${json.orderId}`);
        addToast('SUCCESS', 'Order Filled on Zerodha', `Order ID: ${json.orderId}. ${signal.symbol} (${qty} Qty @ ₹${signal.entryPrice}) is now ACTIVE.`);
      } else {
        // DO NOT add to positions - Surface the exact rejection error
        setActiveOrderResult({
          symbol: signal.symbol,
          direction: transactionType,
          quantity: qty,
          price: signal.entryPrice,
          errorMsg: json.message || 'Zerodha rejection: Order could not be placed on Kite.'
        });
        triggerUserFeedback(`Order Failed: ${json.message || 'Zerodha rejection'}`, true);
        addToast('ERROR', 'Order Execution Error', json.message || 'Zerodha rejection: Check daily access token in API settings.');
        addLog('SYSTEM', `ZERODHA REJECT: ${json.message}`, signal.symbol);
      }
    } catch (err: any) {
      setActiveOrderResult({
        symbol: signal.symbol,
        direction: transactionType,
        quantity: qty,
        price: signal.entryPrice,
        errorMsg: `Routing Error: ${err.message || 'Gateway unreachable'}`
      });
      triggerUserFeedback(`Routing Error: ${err.message}`, true);
      addToast('ERROR', 'Gateway Network Error', `Could not route order to Zerodha: ${err.message}`);
    } finally {
      setIsOrderModalOpen(true);
    }
  };

  // Exit Position
  const handleExitPosition = async (pos: ActivePosition, customReasonText?: string) => {
    // SHADOW / PAPER TRADING EXIT HANDLER
    if (tradingMode === 'SHADOW' || (pos.orderId && pos.orderId.startsWith('SHADOW-'))) {
      const exitReason = customReasonText || 'MANUAL_SQUAREOFF';
      recordClosedTradeToJournal(pos, exitReason);

      setRecentlyExitedSymbols((prev) => ({
        ...prev,
        [pos.symbol]: {
          exitPrice: pos.currentPrice,
          reason: exitReason,
          exitedAt: new Date().toLocaleTimeString()
        }
      }));

      setPositions((prev) => prev.filter((p) => p.id !== pos.id));

      addLog('FILL_SELL', `[🟢 SHADOW SIMULATION] Paper position exited: ${pos.symbol} @ ₹${pos.currentPrice}. P&L: ₹${pos.unrealizedPnL.toFixed(2)} (${exitReason})`, pos.symbol);
      triggerUserFeedback(`✓ [SHADOW TRADING] Exited ${pos.symbol} @ ₹${pos.currentPrice}. Realized P&L: ₹${pos.unrealizedPnL.toFixed(2)}`);
      addToast(
        pos.unrealizedPnL >= 0 ? 'SUCCESS' : 'WARNING',
        'Shadow Position Exited',
        `[SHADOW] Exited ${pos.symbol} (${pos.quantity} Qty @ ₹${pos.currentPrice}). Realized P&L: ₹${pos.unrealizedPnL.toFixed(2)} (${exitReason}).`
      );
      return;
    }

    // LIVE ZERODHA API EXIT HANDLER
    const exitDirection = pos.direction === 'BUY' ? 'SELL' : 'BUY';
    addLog('FILL_SELL', `Sending square-off order for ${pos.symbol} to Zerodha...`, pos.symbol);
    addToast('INFO', 'Square-Off Order Sent', `Closing position ${pos.symbol} (${pos.quantity} Qty @ ₹${pos.currentPrice})...`);

    const keyToUse = zerodhaCreds.apiKey || localStorage.getItem('zerodha_api_key') || '';
    const tokenToUse = zerodhaCreds.accessToken || localStorage.getItem('zerodha_access_token') || '';

    const isOpt = pos.symbol.includes('CE') || pos.symbol.includes('PE') || pos.exchange === 'NFO' || pos.exchange === 'BFO';

    try {
      const res = await fetch('/api/zerodha/execute-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToUse,
          accessToken: tokenToUse,
          tradingsymbol: pos.tradingsymbol,
          exchange: pos.exchange,
          transaction_type: exitDirection,
          quantity: pos.quantity,
          order_type: isOpt ? 'LIMIT' : 'MARKET',
          product: isOpt ? 'NRML' : 'MIS',
          price: pos.currentPrice
        })
      });

      let json: any;
      try {
        const text = await res.text();
        json = JSON.parse(text);
      } catch {
        json = {
          success: false,
          message: `Server returned non-JSON (${res.status} ${res.statusText}). Server was momentarily resetting.`
        };
      }

      if (json.success) {
        const exitReason = customReasonText || 'MANUAL_SQUAREOFF';
        recordClosedTradeToJournal(pos, exitReason);

        setRecentlyExitedSymbols((prev) => ({
          ...prev,
          [pos.symbol]: {
            exitPrice: pos.currentPrice,
            reason: exitReason,
            exitedAt: new Date().toLocaleTimeString()
          }
        }));

        setPositions((prev) => prev.filter((p) => p.id !== pos.id));

        addLog('API_ACK', `POSITION EXITED ON ZERODHA! ${pos.symbol} @ ₹${pos.currentPrice}. P&L: ₹${pos.unrealizedPnL.toFixed(2)}`, pos.symbol);
        triggerUserFeedback(`✓ Position Exited: ${pos.symbol} squared off on Zerodha. P&L: ₹${pos.unrealizedPnL.toFixed(2)}`);
        addToast(
          pos.unrealizedPnL >= 0 ? 'SUCCESS' : 'WARNING',
          'Position Squared Off',
          `Exited ${pos.symbol} (${pos.quantity} Qty @ ₹${pos.currentPrice}). Realized P&L: ₹${pos.unrealizedPnL.toFixed(2)} (${exitReason}).`
        );
      } else {
        const isIpBlock = json.isIpBlocked || json.errorType === 'PermissionException' || json.message?.includes('not allowed to place orders');
        triggerUserFeedback(`Exit Order Failed: ${json.message || 'Zerodha rejection'}`, true);
        if (isIpBlock) {
          addToast(
            'ERROR',
            'Zerodha IP Whitelist Error',
            `Kite blocked IP (2600:1900:0:3e02::1400). If you already exited on Kite Mobile App, click 'CLEAR' on the position row to remove it from this terminal.`
          );
        } else {
          addToast('ERROR', 'Square-Off Rejection', json.message || 'Zerodha rejected exit order.');
        }
      }
    } catch (err: any) {
      addLog('SYSTEM', `Exit Order Error: ${err.message}`, pos.symbol);
      triggerUserFeedback(`Exit Order Error: ${err.message}`, true);
      addToast('ERROR', 'Exit Order Network Error', err.message);
    }
  };

  // Force-remove position if already closed on Kite mobile app
  const handleForceRemovePosition = (pos: ActivePosition) => {
    recordClosedTradeToJournal(pos, 'MANUAL_CLOSED_ON_KITE_APP');
    setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    setRecentlyExitedSymbols((prev) => ({
      ...prev,
      [pos.symbol]: {
        exitPrice: pos.currentPrice,
        reason: 'MANUAL_CLOSED_ON_KITE_APP',
        exitedAt: new Date().toLocaleTimeString()
      }
    }));
    triggerUserFeedback(`Cleared ${pos.symbol} from active tracking desk.`);
    addToast('INFO', 'Position Cleared', `Removed ${pos.symbol} from active desk. Logged to trade journal.`);
  };

  // Discard and Re-generate a Fresh Trade Setup with updated timings and prices
  const handleDiscardAndRefreshTrade = (signalId: string, symbol: string) => {
    const freshSignal = generateFreshRecalibratedSignal(symbol, quotes);

    setLiveSignals((prev) =>
      prev.map((s) => (s.id === signalId || s.symbol.toUpperCase() === symbol.toUpperCase() ? freshSignal : s))
    );

    addLog('SYSTEM', `🔄 RE-CALIBRATED TRADE: Discarded stale setup for ${symbol} and generated fresh trade signal with updated prices (Entry: ₹${freshSignal.entryPrice}, Target: ₹${freshSignal.targetPrice}, SL: ₹${freshSignal.stopLossPrice}, LTP: ₹${freshSignal.currentLtp}) & new 15-min window.`, symbol);
    triggerUserFeedback(`✓ Re-calibrated ${symbol}: Loaded fresh trade idea (Entry ₹${freshSignal.entryPrice} | Target ₹${freshSignal.targetPrice} | SL ₹${freshSignal.stopLossPrice}).`);
    addToast('SUCCESS', 'Signal Recalibrated', `Fresh setup generated for ${symbol}: Entry ₹${freshSignal.entryPrice}, Target ₹${freshSignal.targetPrice}, SL ₹${freshSignal.stopLossPrice}`);
  };

  // Auto-Check Expiry for Signals every 30s
  useEffect(() => {
    const expiryInterval = setInterval(() => {
      const now = Date.now();
      setLiveSignals((prev) =>
        prev.map((sig) => {
          const exp = sig.expiresAtMs || ((sig.generatedAtMs || (now - 180000)) + 15 * 60000);
          if (now >= exp && sig.status !== 'DISCARDED') {
            return {
              ...sig,
              status: 'DISCARDED',
              discardReason: '15-min Intraday Scalp Window Expired'
            };
          }
          return sig;
        })
      );
    }, 30000);

    return () => clearInterval(expiryInterval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#D1D5DB] font-mono flex flex-col antialiased selection:bg-[#3B82F6] selection:text-white relative">
      
      {/* Top Main Navigation Header */}
      <header className="bg-[#111827] border-b border-[#1F2937] px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        
        {/* Logo / Home Button */}
        <button
          onClick={handleHomeRefresh}
          className="flex items-center space-x-2.5 group cursor-pointer text-left focus:outline-none"
          title="Click Logo or Home to Refresh Terminal & Load Fresh AI Signals"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 flex items-center justify-center text-black font-black text-base shadow-md group-hover:scale-105 transition-transform">
            <Home className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2 group-hover:text-amber-300 transition-colors">
              <span>GoldenGate Sniper Hub</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-black">v2.5 PRO</span>
            </h1>
            <p className="text-[9.5px] text-gray-400 hidden sm:block">
              Intraday Options & Equity Sniper Engine • Zerodha Kite Connect v3
            </p>
          </div>
        </button>

        {/* PROMINENT LIVE / SHADOW TRADING MODE TOGGLE */}
        <div className="flex items-center bg-[#0B0F19] p-1 rounded-lg border-2 border-[#1E293B] shadow-inner">
          <button
            onClick={() => handleToggleTradingMode('SHADOW')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-black text-xs uppercase tracking-wider transition-all ${
              tradingMode === 'SHADOW'
                ? 'bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Shadow Paper Trading: Real live market prices, simulated risk-free execution"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping shrink-0" />
            <span>🟢 SHADOW (SANDBOX)</span>
          </button>

          <button
            onClick={() => handleToggleTradingMode('LIVE')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-black text-xs uppercase tracking-wider transition-all ${
              tradingMode === 'LIVE'
                ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 animate-pulse'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Live Real Trading: Dispatches actual orders to your authenticated Zerodha Kite account"
          >
            <span className="w-2 h-2 rounded-full bg-rose-200 shrink-0" />
            <span>🔴 LIVE ZERODHA</span>
          </button>
        </div>

        {/* Action Controls Ribbon */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          
          {/* Emergency Kill-Switch Button */}
          <button
            onClick={() => {
              triggerUserFeedback('Opened Emergency Kill-Switch Confirmation Dialog.');
              setIsEmergencyStopOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:from-rose-600 hover:to-red-500 text-white font-extrabold px-2.5 sm:px-3 py-1.5 rounded text-[10.5px] sm:text-[11px] shadow border border-rose-400 transition-all uppercase tracking-wider active:scale-95 shrink-0"
            title="Emergency Kill-Switch: Immediately Halt Auto-Trader and Squareoff All Positions"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="hidden sm:inline">🚨 EMERGENCY STOP</span>
            <span className="sm:hidden">🚨 STOP</span>
          </button>

          {/* Auto-Trader Toggle Control */}
          <button
            onClick={() => {
              if (!isAutoTrading) {
                triggerUserFeedback('Opened Selective Profit-Only Auto-Trader Activation Modal.');
                setIsAutoTraderConfirmOpen(true);
              } else {
                setIsAutoTrading(false);
                triggerUserFeedback('⏸️ Auto-Trader Stopped. Switched to manual execution mode.');
                addToast('INFO', 'Auto-Trader Paused', 'Automated trade execution paused. Open positions remain tracked with manual square-off.');
                addLog('SYSTEM', '⏸️ AUTO-TRADER PAUSED.');
              }
            }}
            className={`flex items-center space-x-1.5 font-black px-3 py-1.5 rounded text-[10.5px] sm:text-[11px] shadow border transition-all uppercase tracking-wider active:scale-95 ${
              isAutoTrading
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-600'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{isAutoTrading ? '🤖 AUTO-TRADER ON' : '🤖 START AUTO-TRADER'}</span>
          </button>

          {/* Data Files & Permanent Orders Logbook Button */}
          <button
            onClick={() => {
              triggerUserFeedback('Opened Data Files, Orders & Execution Logbook Modal.');
              setIsDataFilesModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-2.5 sm:px-3 py-1.5 rounded text-[10.5px] sm:text-[11px] shadow border border-slate-700 transition-all uppercase tracking-wider active:scale-95"
            title="Data Files & Audit Hub: Real Live vs Shadow P&L, Rejected Trades, Price Errors & JSON/CSV Exports"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">📁 DATA LOGBOOK</span>
            <span className="md:hidden">📁 DATA</span>
          </button>

          {/* System Help & Knowledge Base Modal Button */}
          <button
            onClick={() => {
              triggerUserFeedback('Opened System Help & Knowledge Base Modal.');
              setIsHelpModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold px-2.5 sm:px-3 py-1.5 rounded text-[10.5px] sm:text-[11px] shadow border border-slate-700 transition-all uppercase tracking-wider active:scale-95"
            title="System Help & Knowledge: Greeks, Risk Controls, Execution Modes and Trading Rules"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">ℹ️ HELP</span>
          </button>

          {/* Quant Memory & Journal Modal Button */}
          <button
            onClick={() => {
              triggerUserFeedback('Opened Quant AI Learning Journal & Historical Memory Modal.');
              setIsJournalModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black px-3 py-1.5 rounded text-[10.5px] sm:text-[11px] shadow border border-amber-300 transition-all uppercase tracking-wider active:scale-95"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">🧠 QUANT JOURNAL</span>
            <span className="sm:hidden">🧠 JOURNAL</span>
          </button>

        </div>
      </header>

      {/* WORKSPACE NAVIGATION TABS (SNIPER HUB vs QUANT LAB BLANKET) */}
      <div className="bg-[#0B0F19] border-b border-[#1E293B] px-3 sm:px-6 py-2 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-2 text-xs font-black uppercase">
          <button
            onClick={() => setActiveTab('SNIPER_HUB')}
            className={`px-4 py-2 rounded-md transition-all flex items-center space-x-2 ${
              activeTab === 'SNIPER_HUB'
                ? 'bg-amber-500 text-black shadow-lg font-black'
                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>🎯 LIVE SNIPER HUB (ONE-CLICK TRADES)</span>
          </button>

          <button
            onClick={() => setActiveTab('POSITIONS_ORDERS')}
            className={`px-4 py-2 rounded-md transition-all flex items-center space-x-2 ${
              activeTab === 'POSITIONS_ORDERS'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>💼 ACTIVE DESK & ORDERS ({positions.filter((p) => p.status === 'OPEN').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('QUANT_LAB')}
            className={`px-4 py-2 rounded-md transition-all flex items-center space-x-2 ${
              activeTab === 'QUANT_LAB'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-900 text-gray-400 hover:text-indigo-300 hover:bg-gray-800 border border-dashed border-indigo-900/60'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-indigo-400" />
            <span>🔬 QUANT LAB (UNDER BLANKET)</span>
          </button>

          <button
            onClick={() => setActiveTab('JOURNAL_LOGS')}
            className={`px-4 py-2 rounded-md transition-all flex items-center space-x-2 ${
              activeTab === 'JOURNAL_LOGS'
                ? 'bg-teal-600 text-white shadow-lg'
                : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>📜 AUDIT & JOURNAL LOGS</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-[11px] text-gray-400">
          <span>Mode: <strong className={tradingMode === 'LIVE' ? 'text-rose-400' : 'text-emerald-400'}>{tradingMode} TRADING</strong></span>
          <span>•</span>
          <span>100 Instruments Funnel Active</span>
        </div>
      </div>

      {/* ALWAYS-PRESENT PROMINENT CAUTION BANNER WHEN IN REAL LIVE TRADING MODE */}
      <LiveTradingCautionBanner
        tradingMode={tradingMode}
        onSwitchToShadow={() => handleToggleTradingMode('SHADOW')}
        zerodhaUser={zerodhaCreds.userLoginId}
        isZerodhaConnected={zerodhaCreds.isConnected}
      />

      {/* Prominent Banner when Auto Trading is ON */}
      {isAutoTrading && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#0B2119] to-emerald-950 border-b border-emerald-500/50 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-extrabold uppercase text-white tracking-wide text-[11px]">
              🤖 SELECTIVE PROFIT-ONLY AUTO-TRADER ACTIVE:
            </span>
            <span className="text-emerald-300 text-[11px]">
              Zero Forced Trades • Executes ONLY High-Confidence Setups (≥80% Win Prob & R:R ≥ 2.0) with Dynamic Trailing SL
            </span>
          </div>

          <button
            onClick={() => setIsEmergencyStopOpen(true)}
            className="text-[10px] bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/60 px-2 py-0.5 rounded font-bold uppercase"
          >
            Emergency Kill-Switch
          </button>
        </div>
      )}

      {/* User Feedback Floating Top Banner */}
      {userFeedbackMsg && (
        <div className="bg-amber-500 text-black font-extrabold px-4 py-2 text-center text-xs shadow-xl animate-in fade-in slide-in-from-top duration-200 flex items-center justify-center space-x-2 border-b border-amber-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{userFeedbackMsg}</span>
        </div>
      )}

      {/* Live Market Ticker Bar */}
      <LiveTickerBar
        quotes={quotes}
        isFetchingQuotes={isFetchingQuotes}
        isZerodhaConnected={zerodhaCreds.isConnected}
        onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
        autoSync={autoSyncQuotes}
        onToggleAutoSync={() => {
          const nextVal = !autoSyncQuotes;
          setAutoSyncQuotes(nextVal);
          triggerUserFeedback(nextVal ? 'Enabled 5-second automatic live market quote sync.' : 'Disabled automatic quote sync (manual refresh mode).');
        }}
        lastSyncTime={lastQuoteSyncTime}
        quoteSource={quoteSource}
        onUserActionFeedback={triggerUserFeedback}
      />

      {/* Main Terminal Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-5 pb-16">
        
        {/* STEP 1: Always Present Top Trading Anchor (Zerodha Connection & Quick Select) */}
        <ZerodhaConnectionHeader
          creds={zerodhaCreds}
          onUpdateCreds={setZerodhaCreds}
          onDisconnect={handleDisconnectZerodha}
          onUserActionFeedback={triggerUserFeedback}
        />

        {/* ========================================================================= */}
        {/* TAB 1: LIVE SNIPER HUB (Primary Action Desk) */}
        {/* ========================================================================= */}
        {activeTab === 'SNIPER_HUB' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Quick Select Ribbon */}
            <QuickSelectRibbon
              selectedContractSymbol={selectedContractSymbol}
              liveQuotes={quotes}
              spotIndices={spotIndices}
              liveSignals={liveSignals}
              isConnected={zerodhaCreds.isConnected}
              onRefreshQuotes={() => handleFetchLiveQuotes(false)}
              isFetchingQuotes={isFetchingQuotes}
              onSelectContract={(sym) => {
                setSelectedContractSymbol(sym);
                const dynamicSig = getOrCreateSignalForSymbol(sym, liveSignals);
                if (!liveSignals.some((s) => s.symbol.toUpperCase() === dynamicSig.symbol.toUpperCase())) {
                  setLiveSignals((prev) => [dynamicSig, ...prev]);
                }
                triggerUserFeedback(`Quick Selected: ${sym}`);
              }}
              onTriggerFeedback={triggerUserFeedback}
            />

            {/* Golden Funnel Multi-Asset Scanner Ribbon */}
            <div className="bg-[#111827] border-2 border-amber-500/40 rounded-xl p-3 sm:p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black font-black text-sm shadow">
                    🌪️
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                      <span>Golden Funnel Scanner</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">100 Liquid Universe</span>
                    </h2>
                    <p className="text-[10px] text-gray-400">
                      100 Scanned ➔ 12 Quality Filtered ➔ 3 High Confluence ➔ 1 Alpha Pick (Rank #1)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const funnelResults = scanGoldenFunnelUniverse(quotes, spotIndices);
                      setLiveSignals(funnelResults.rankedSignals);
                      const alphaSym = funnelResults.alphaPick?.symbol || funnelResults.rankedSignals[0]?.symbol || 'NIFTY';
                      triggerUserFeedback(`🌪️ Scanned 100 instruments: Found #${alphaSym} as Rank #1 Alpha Pick!`);
                      addToast('SUCCESS', 'Golden Funnel Recalculated', `Scanned 100 liquid assets. #1 Alpha Pick is ${alphaSym}.`);
                    }}
                    className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black px-3 py-1.5 rounded-lg text-xs shadow transition-all active:scale-95 uppercase tracking-wider cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>RE-SCAN 100 ASSETS</span>
                  </button>
                </div>
              </div>

              {/* Funnel Pipeline Visual & Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="text-gray-400 text-[11px] mr-1 uppercase">Filter View:</span>
                
                <button
                  onClick={() => setScannerFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase ${
                    scannerFilter === 'ALL'
                      ? 'bg-amber-500 text-black font-black shadow'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🏆 ALL 100 RANKED
                </button>

                <button
                  onClick={() => setScannerFilter('ALPHA_PICK')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase flex items-center space-x-1 ${
                    scannerFilter === 'ALPHA_PICK'
                      ? 'bg-emerald-500 text-black font-black shadow ring-2 ring-emerald-300'
                      : 'bg-gray-800 text-emerald-300 hover:bg-gray-700 border border-emerald-500/30'
                  }`}
                >
                  <span>⭐ #1 ALPHA PICK ONLY</span>
                </button>

                <button
                  onClick={() => setScannerFilter('TOP_3')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase ${
                    scannerFilter === 'TOP_3'
                      ? 'bg-blue-600 text-white font-black shadow ring-1 ring-blue-300'
                      : 'bg-gray-800 text-blue-300 hover:bg-gray-700'
                  }`}
                >
                  ⚡ TOP 3 STRONG (75%+ WIN)
                </button>

                <button
                  onClick={() => setScannerFilter('TOP_12')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase ${
                    scannerFilter === 'TOP_12'
                      ? 'bg-purple-600 text-white font-black shadow'
                      : 'bg-gray-800 text-purple-300 hover:bg-gray-700'
                  }`}
                >
                  🎯 TOP 12 SHORTLIST
                </button>

                <button
                  onClick={() => setScannerFilter('NIFTY')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase ${
                    scannerFilter === 'NIFTY'
                      ? 'bg-amber-600 text-white font-black shadow'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  📊 NIFTY F&O
                </button>

                <button
                  onClick={() => setScannerFilter('BANKNIFTY')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase ${
                    scannerFilter === 'BANKNIFTY'
                      ? 'bg-amber-600 text-white font-black shadow'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🏦 BANKNIFTY F&O
                </button>

                <button
                  onClick={() => setScannerFilter('STOCKS')}
                  className={`px-2.5 py-1 rounded-md transition-all text-[11px] uppercase ${
                    scannerFilter === 'STOCKS'
                      ? 'bg-teal-600 text-white font-black shadow'
                      : 'bg-gray-800 text-teal-300 hover:bg-gray-700'
                  }`}
                >
                  📈 HIGH-RVOL STOCKS
                </button>
              </div>
            </div>

            {/* Layout Mode Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0A0B0E] p-2 rounded-xl border border-gray-800">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">Workspace Layout:</span>
                <button
                  onClick={() => {
                    setHubLayoutMode('SIDE_BY_SIDE');
                    triggerUserFeedback('Switched to Side-by-Side Dual Deck Layout (Universe + Signals)');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-1.5 ${
                    hubLayoutMode === 'SIDE_BY_SIDE'
                      ? 'bg-blue-600 text-white shadow-lg border border-blue-400/40 ring-1 ring-blue-400/30'
                      : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                  title="Side-by-side split screen: Left Universe Radar, Right Quant Signals"
                >
                  <span>⬛ Side-by-Side (Split)</span>
                </button>

                <button
                  onClick={() => {
                    setHubLayoutMode('TABS');
                    triggerUserFeedback('Switched to Sub-Tabs View');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-1.5 ${
                    hubLayoutMode === 'TABS'
                      ? 'bg-purple-600 text-white shadow-lg border border-purple-400/40 ring-1 ring-purple-400/30'
                      : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  <span>📑 Sub-Tabs</span>
                </button>

                <button
                  onClick={() => {
                    setHubLayoutMode('STACKED');
                    triggerUserFeedback('Switched to Stacked Vertical Layout');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-1.5 ${
                    hubLayoutMode === 'STACKED'
                      ? 'bg-gray-700 text-white shadow-lg border border-gray-500'
                      : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  <span>⬇️ Stacked</span>
                </button>
              </div>

              {hubLayoutMode === 'TABS' && (
                <div className="flex items-center space-x-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
                  <button
                    onClick={() => setHubSubTab('CONTRACTS')}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${hubSubTab === 'CONTRACTS' ? 'bg-amber-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    1. Tradable Universe (Radar)
                  </button>
                  <button
                    onClick={() => setHubSubTab('SIGNALS')}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${hubSubTab === 'SIGNALS' ? 'bg-blue-600 text-white font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    2. Quant Signals & Execution
                  </button>
                </div>
              )}
            </div>

            {/* SIDE-BY-SIDE LAYOUT */}
            {hubLayoutMode === 'SIDE_BY_SIDE' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column: Dense Tradable Universe Radar (5 cols) */}
                <div className="lg:col-span-5 w-full">
                  <ContractCatalog
                    contracts={getDynamicTradeableContracts(spotIndices)}
                    liveQuotes={quotes}
                    spotIndices={spotIndices}
                    onScanSignalsForContract={(symbol, cat) => handleAiReadSignals(symbol, cat)}
                    isScanning={isAiScanning}
                    selectedContractSymbol={selectedContractSymbol}
                    onSelectContract={(sym) => {
                      setSelectedContractSymbol(sym);
                      const dynamicSig = getOrCreateSignalForSymbol(sym, liveSignals);
                      if (!liveSignals.some((s) => s.symbol.toUpperCase() === dynamicSig.symbol.toUpperCase())) {
                        setLiveSignals((prev) => [dynamicSig, ...prev]);
                      }
                      triggerUserFeedback(`Filtered Quant Signals for: ${sym}`);
                    }}
                    onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
                    isFetchingQuotes={isFetchingQuotes}
                    onUserActionFeedback={triggerUserFeedback}
                    isSideBySide={true}
                  />
                </div>

                {/* Right Column: Dense Quant Signals & Execution Deck (7 cols) */}
                <div className="lg:col-span-7 w-full">
                  <LiveSignalsView
                    signals={liveSignals.filter((sig) => {
                      if (scannerFilter === 'ALPHA_PICK') return sig.funnelRank === 1;
                      if (scannerFilter === 'TOP_3') return sig.funnelRank && sig.funnelRank <= 3;
                      if (scannerFilter === 'TOP_12') return sig.funnelRank && sig.funnelRank <= 12;
                      if (scannerFilter === 'NIFTY') return sig.symbol.includes('NIFTY') && !sig.symbol.includes('BANKNIFTY') && !sig.symbol.includes('FINNIFTY') && !sig.symbol.includes('MIDCPNIFTY');
                      if (scannerFilter === 'BANKNIFTY') return sig.symbol.includes('BANKNIFTY');
                      if (scannerFilter === 'STOCKS') return sig.category === 'EQUITY_INTRADAY' || (!sig.symbol.includes('NIFTY') && !sig.symbol.includes('SENSEX'));
                      return true;
                    })}
                    selectedContractSymbol={selectedContractSymbol}
                    onClearContractFilter={() => {
                      setSelectedContractSymbol('');
                      triggerUserFeedback('Cleared contract filter; showing all market signals.');
                    }}
                    onExecuteSignalZerodha={handleExecuteSignalOnZerodha}
                    onExecuteSignalShadow={handleExecuteSignalShadow}
                    onOpenModalForSignal={(sig) => {
                      setSelectedModalSignal(sig);
                      setIsTradeDetailsModalOpen(true);
                      triggerUserFeedback(`Opened Full Quant Math Modal for ${sig.symbol}`);
                    }}
                    onAiScanSignals={() => handleAiReadSignals('ALL', 'ALL')}
                    isAiScanning={isAiScanning}
                    onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
                    isFetchingQuotes={isFetchingQuotes}
                    onUserActionFeedback={triggerUserFeedback}
                    openPositionSymbols={positions.filter((p) => p.status === 'OPEN').map((p) => p.symbol)}
                    recentlyExitedSymbols={recentlyExitedSymbols}
                    onDiscardAndRefreshTrade={handleDiscardAndRefreshTrade}
                    onViewPositionsTab={() => setActiveTab('POSITIONS_ORDERS')}
                    isSideBySide={true}
                    tradingMode={tradingMode}
                    quotes={quotes}
                  />
                </div>
              </div>
            )}

            {/* TABS LAYOUT */}
            {hubLayoutMode === 'TABS' && (
              <div className="space-y-4">
                {hubSubTab === 'CONTRACTS' && (
                  <ContractCatalog
                    contracts={getDynamicTradeableContracts(spotIndices)}
                    liveQuotes={quotes}
                    spotIndices={spotIndices}
                    onScanSignalsForContract={(symbol, cat) => handleAiReadSignals(symbol, cat)}
                    isScanning={isAiScanning}
                    selectedContractSymbol={selectedContractSymbol}
                    onSelectContract={(sym) => {
                      setSelectedContractSymbol(sym);
                      const dynamicSig = getOrCreateSignalForSymbol(sym, liveSignals);
                      if (!liveSignals.some((s) => s.symbol.toUpperCase() === dynamicSig.symbol.toUpperCase())) {
                        setLiveSignals((prev) => [dynamicSig, ...prev]);
                      }
                      setHubSubTab('SIGNALS');
                      triggerUserFeedback(`Selected ${sym} - Switched to Quant Signals`);
                    }}
                    onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
                    isFetchingQuotes={isFetchingQuotes}
                    onUserActionFeedback={triggerUserFeedback}
                    isSideBySide={false}
                  />
                )}

                {hubSubTab === 'SIGNALS' && (
                  <LiveSignalsView
                    signals={liveSignals.filter((sig) => {
                      if (scannerFilter === 'ALPHA_PICK') return sig.funnelRank === 1;
                      if (scannerFilter === 'TOP_3') return sig.funnelRank && sig.funnelRank <= 3;
                      if (scannerFilter === 'TOP_12') return sig.funnelRank && sig.funnelRank <= 12;
                      if (scannerFilter === 'NIFTY') return sig.symbol.includes('NIFTY') && !sig.symbol.includes('BANKNIFTY') && !sig.symbol.includes('FINNIFTY') && !sig.symbol.includes('MIDCPNIFTY');
                      if (scannerFilter === 'BANKNIFTY') return sig.symbol.includes('BANKNIFTY');
                      if (scannerFilter === 'STOCKS') return sig.category === 'EQUITY_INTRADAY' || (!sig.symbol.includes('NIFTY') && !sig.symbol.includes('SENSEX'));
                      return true;
                    })}
                    selectedContractSymbol={selectedContractSymbol}
                    onClearContractFilter={() => {
                      setSelectedContractSymbol('');
                      triggerUserFeedback('Cleared contract filter; showing all market signals.');
                    }}
                    onExecuteSignalZerodha={handleExecuteSignalOnZerodha}
                    onExecuteSignalShadow={handleExecuteSignalShadow}
                    onOpenModalForSignal={(sig) => {
                      setSelectedModalSignal(sig);
                      setIsTradeDetailsModalOpen(true);
                      triggerUserFeedback(`Opened Full Quant Math Modal for ${sig.symbol}`);
                    }}
                    onAiScanSignals={() => handleAiReadSignals('ALL', 'ALL')}
                    isAiScanning={isAiScanning}
                    onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
                    isFetchingQuotes={isFetchingQuotes}
                    onUserActionFeedback={triggerUserFeedback}
                    openPositionSymbols={positions.filter((p) => p.status === 'OPEN').map((p) => p.symbol)}
                    recentlyExitedSymbols={recentlyExitedSymbols}
                    onDiscardAndRefreshTrade={handleDiscardAndRefreshTrade}
                    onViewPositionsTab={() => setActiveTab('POSITIONS_ORDERS')}
                    isSideBySide={false}
                    tradingMode={tradingMode}
                    quotes={quotes}
                  />
                )}
              </div>
            )}

            {/* STACKED LAYOUT */}
            {hubLayoutMode === 'STACKED' && (
              <div className="space-y-5">
                <ContractCatalog
                  contracts={getDynamicTradeableContracts(spotIndices)}
                  liveQuotes={quotes}
                  spotIndices={spotIndices}
                  onScanSignalsForContract={(symbol, cat) => handleAiReadSignals(symbol, cat)}
                  isScanning={isAiScanning}
                  selectedContractSymbol={selectedContractSymbol}
                  onSelectContract={(sym) => {
                    setSelectedContractSymbol(sym);
                    const dynamicSig = getOrCreateSignalForSymbol(sym, liveSignals);
                    if (!liveSignals.some((s) => s.symbol.toUpperCase() === dynamicSig.symbol.toUpperCase())) {
                      setLiveSignals((prev) => [dynamicSig, ...prev]);
                    }
                  }}
                  onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
                  isFetchingQuotes={isFetchingQuotes}
                  onUserActionFeedback={triggerUserFeedback}
                  isSideBySide={false}
                />

                <LiveSignalsView
                  signals={liveSignals.filter((sig) => {
                    if (scannerFilter === 'ALPHA_PICK') return sig.funnelRank === 1;
                    if (scannerFilter === 'TOP_3') return sig.funnelRank && sig.funnelRank <= 3;
                    if (scannerFilter === 'TOP_12') return sig.funnelRank && sig.funnelRank <= 12;
                    if (scannerFilter === 'NIFTY') return sig.symbol.includes('NIFTY') && !sig.symbol.includes('BANKNIFTY') && !sig.symbol.includes('FINNIFTY') && !sig.symbol.includes('MIDCPNIFTY');
                    if (scannerFilter === 'BANKNIFTY') return sig.symbol.includes('BANKNIFTY');
                    if (scannerFilter === 'STOCKS') return sig.category === 'EQUITY_INTRADAY' || (!sig.symbol.includes('NIFTY') && !sig.symbol.includes('SENSEX'));
                    return true;
                  })}
                  selectedContractSymbol={selectedContractSymbol}
                  onClearContractFilter={() => {
                    setSelectedContractSymbol('');
                    triggerUserFeedback('Cleared contract filter; showing all market signals.');
                  }}
                  onExecuteSignalZerodha={handleExecuteSignalOnZerodha}
                  onExecuteSignalShadow={handleExecuteSignalShadow}
                  onOpenModalForSignal={(sig) => {
                    setSelectedModalSignal(sig);
                    setIsTradeDetailsModalOpen(true);
                    triggerUserFeedback(`Opened Full Quant Math Modal for ${sig.symbol}`);
                  }}
                  onAiScanSignals={() => handleAiReadSignals('ALL', 'ALL')}
                  isAiScanning={isAiScanning}
                  onFetchLiveQuotes={() => handleFetchLiveQuotes(false)}
                  isFetchingQuotes={isFetchingQuotes}
                  onUserActionFeedback={triggerUserFeedback}
                  openPositionSymbols={positions.filter((p) => p.status === 'OPEN').map((p) => p.symbol)}
                  recentlyExitedSymbols={recentlyExitedSymbols}
                  onDiscardAndRefreshTrade={handleDiscardAndRefreshTrade}
                  onViewPositionsTab={() => setActiveTab('POSITIONS_ORDERS')}
                  isSideBySide={false}
                  tradingMode={tradingMode}
                  quotes={quotes}
                />
              </div>
            )}

            {/* Quick Open Positions & MTM Ribbon (Clean Replacement for Full Duplicate Positions Table) */}
            {positions.filter((p) => p.status === 'OPEN').length > 0 && (
              <div className="bg-[#0A0B0E] border border-emerald-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center space-x-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      {positions.filter((p) => p.status === 'OPEN').length} Active Position(s) Running on Live Desk
                    </span>
                    <div className="text-[11px] font-mono font-bold flex items-center space-x-2">
                      <span className="text-gray-400">Total Unrealized MTM:</span>
                      <span className={positions.filter((p) => p.status === 'OPEN').reduce((acc, p) => acc + (p.unrealizedPnL || 0), 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {positions.filter((p) => p.status === 'OPEN').reduce((acc, p) => acc + (p.unrealizedPnL || 0), 0) >= 0 ? '+' : ''}
                        ₹{positions.filter((p) => p.status === 'OPEN').reduce((acc, p) => acc + (p.unrealizedPnL || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('POSITIONS_ORDERS');
                    triggerUserFeedback('Navigated to Active Positions & Order Book Desk');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg shadow uppercase tracking-wider flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
                >
                  <span>Open Full Positions & Orders Tab →</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACTIVE DESK & ORDERS */}
        {/* ========================================================================= */}
        {activeTab === 'POSITIONS_ORDERS' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Step 4: Trading Performance & Realized P&L Summary */}
            <TradingPerformanceSummary
              positions={positions}
              orderHistory={orderHistory}
            />

            {/* Step 5: Active Positions */}
            <PositionsTracker
              positions={positions}
              orders={orderHistory}
              quotes={quotes}
              onExitPosition={handleExitPosition}
              onForceRemovePosition={handleForceRemovePosition}
              onRefreshQuotes={() => handleFetchLiveQuotes(false)}
              isFetchingQuotes={isFetchingQuotes}
              onSyncZerodhaPositions={handleSyncZerodhaPositionsAndOrders}
              isSyncingZerodha={isSyncingZerodha}
              onUpdatePositionParams={(posId, updates) => {
                setPositions((prev) => prev.map((p) => (p.id === posId ? { ...p, ...updates } : p)));
                triggerUserFeedback(`Updated position risk parameters.`);
              }}
              onClearAllPositions={() => {
                setPositions([]);
                localStorage.removeItem('goldengate_positions');
                triggerUserFeedback('Cleared all local positions from tracking desk.');
                addToast('INFO', 'Tracking Desk Cleared', 'All open positions removed from tracking desk.');
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUANT LAB & RESEARCH (UNDER BLANKET) */}
        {/* ========================================================================= */}
        {activeTab === 'QUANT_LAB' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-indigo-500/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <span>Quant Lab & Factor Research Hub</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">Under Blanket Layer</span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Advanced statistical diagnostics, Greek stress testing, Monte Carlo risk engines, and historical trade matchers kept separate from live execution flow.
                  </p>
                </div>
              </div>
            </div>

            {/* GoldenGate Edge Engine & Historical Matcher Dashboard */}
            <EdgeEngineDashboard
              selectedSymbol={selectedContractSymbol || 'NIFTY'}
              spotIndices={spotIndices}
              liveQuotes={quotes}
              onSelectContract={(sym) => {
                setSelectedContractSymbol(sym);
                const dynamicSig = getOrCreateSignalForSymbol(sym, liveSignals);
                if (!liveSignals.some((s) => s.symbol.toUpperCase() === dynamicSig.symbol.toUpperCase())) {
                  setLiveSignals((prev) => [dynamicSig, ...prev]);
                }
              }}
              onTriggerFeedback={triggerUserFeedback}
            />

            {/* GoldenGate Empirical Strategy Research & Factor Attribution Lab */}
            <StrategyResearchLab
              onClose={() => setActiveTab('SNIPER_HUB')}
              onTriggerFeedback={triggerUserFeedback}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUDIT & JOURNAL LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'JOURNAL_LOGS' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-teal-500/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-teal-600/30 border border-teal-500/50 flex items-center justify-center text-teal-300">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <span>Quant Execution Audit & Memory Hub</span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Real-time WebSocket event logs, Kite API order ACK traces, and closed trade learning journal.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsJournalModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-black px-3 py-1.5 rounded-lg text-xs uppercase"
              >
                Open Full Memory Journal Modal
              </button>
            </div>

            {/* Execution Logs */}
            <ExecutionLogs
              logs={logs}
              onClearLogs={() => {
                setLogs([]);
                triggerUserFeedback('Execution logs cleared.');
              }}
            />
          </div>
        )}

      </main>

      {/* Terminal Footer */}
      <footer className="bg-[#111827] border-t border-[#1F2937] px-4 py-3 text-center text-xs text-gray-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-gray-300 font-bold">GoldenGate Quant Terminal</span>
          <span className="text-gray-500">|</span>
          <span>Zerodha Kite Connect v3 Protocol Synchronized</span>
        </div>
        <div className="text-[11px] text-amber-300/90 font-bold">
          Product of Swarnim Capital © 2026. All rights reserved.
        </div>
      </footer>

      {/* Auto-Trader Confirmation Modal */}
      <AutoTraderConfirmModal
        isOpen={isAutoTraderConfirmOpen}
        onClose={() => setIsAutoTraderConfirmOpen(false)}
        onConfirm={(mode) => {
          setIsAutoTrading(true);
          const isLive = mode === 'LIVE';
          triggerUserFeedback(`🤖 SELECTIVE ${mode} AUTO-TRADER ACTIVATED! Monitoring signals & taking trades only with high profit confidence.`);
          addToast('SUCCESS', `${mode} Auto-Trader Activated`, `Auto-Trader is active in ${mode} mode. Mandate: Takes trades only with verified high edge confluence.`);
          addLog('SYSTEM', `🤖 ${mode} AUTO-TRADER ACTIVATED: Mode: ${mode}, Max 3 concurrent positions, 1L capital limit, dual statistical gate.`);
        }}
        capitalINR={autoTradingCapital}
        zerodhaCreds={zerodhaCreds}
        quotesCount={Object.keys(quotes).length}
      />

      {/* Emergency Stop Modal */}
      <EmergencyStopModal
        isOpen={isEmergencyStopOpen}
        onClose={() => setIsEmergencyStopOpen(false)}
        onConfirmKillSwitch={handleExecuteEmergencyKillSwitch}
        activePositionsCount={positions.filter((p) => p.status === 'OPEN').length}
      />

      {/* Quant AI Memory & Learning Journal Modal */}
      <QuantLearningJournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
      />

      {/* Trade Details Modal */}
      <TradeDetailsModal
        isOpen={isTradeDetailsModalOpen}
        onClose={() => setIsTradeDetailsModalOpen(false)}
        signal={selectedModalSignal}
        tradingMode={tradingMode}
        onExecuteZerodhaTrade={(sig, customQty, customOrderType, customPrice, customProduct) => {
          const updatedSig: LiveTradeSignal = {
            ...sig,
            entryPrice: customPrice,
            zerodhaPayload: {
              ...sig.zerodhaPayload,
              quantity: customQty,
              order_type: customOrderType,
              product: customProduct,
              price: customPrice
            }
          };
          handleExecuteSignalOnZerodha(updatedSig);
        }}
      />

      {/* Order Execution Confirmation / Error Modal */}
      <OrderExecutionModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setActiveOrderResult(null);
        }}
        orderDetails={
          activeOrderResult
            ? {
                orderId: activeOrderResult.orderId,
                symbol: activeOrderResult.symbol,
                transactionType: activeOrderResult.direction,
                quantity: activeOrderResult.quantity,
                price: activeOrderResult.price,
                message:
                  activeOrderResult.errorMsg ||
                  `Order executed successfully on Zerodha Kite API! (${activeOrderResult.quantity} Qty @ ₹${activeOrderResult.price})`,
                success: !activeOrderResult.errorMsg
              }
            : null
        }
      />

      {/* Daily Exited Trades & EOD Settlement Modal */}
      <EodSummaryModal
        isOpen={isEodSummaryModalOpen}
        onClose={() => setIsEodSummaryModalOpen(false)}
        journalRecords={getQuantTradeJournal()}
      />

      {/* System Help & Knowledge Modal */}
      <HelpKnowledgeModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Data Files, Orders & Execution Logbook Modal */}
      <DataFilesLogbook
        isOpen={isDataFilesModalOpen}
        onClose={() => setIsDataFilesModalOpen(false)}
        activeTradingMode={tradingMode}
        addToast={addToast}
        liveQuotes={quotes}
        onExecuteShadowTrade={(trade) => {
          const testCategory: 'NIFTY_FNO' | 'BANKNIFTY_FNO' | 'FINNIFTY_FNO' | 'SENSEX_FNO' | 'EQUITY_INTRADAY' =
            trade.symbol.includes('BANKNIFTY') ? 'BANKNIFTY_FNO' :
            trade.symbol.includes('FINNIFTY') ? 'FINNIFTY_FNO' :
            trade.symbol.includes('SENSEX') ? 'SENSEX_FNO' :
            trade.symbol.includes('NIFTY') ? 'NIFTY_FNO' :
            'EQUITY_INTRADAY';

          const lotSize = trade.symbol.includes('BANKNIFTY') ? 15 : trade.symbol.includes('FINNIFTY') ? 25 : trade.symbol.includes('SENSEX') ? 10 : trade.symbol.includes('NIFTY') ? 25 : 1;
          const entryPrice = trade.candidatePrice || 100;
          const testSignal: LiveTradeSignal = {
            id: `REJECT_AUDIT_${Date.now()}`,
            symbol: trade.symbol,
            category: testCategory,
            assetName: trade.symbol,
            direction: trade.candidateDirection || 'BUY',
            timeframe: '5m',
            entryPrice: entryPrice,
            currentLtp: entryPrice,
            targetPrice: +(entryPrice * 1.15).toFixed(2),
            stopLossPrice: +(entryPrice * 0.90).toFixed(2),
            winProbabilityPct: trade.candidateScore || 65,
            riskRewardRatio: 1.5,
            confidenceLevel: 'MEDIUM',
            indicatorConfluence: [`Rejected Candidate Audit: ${trade.reason}`],
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
            dataTimestampMs: Date.now(),
            source: 'SHADOW_SIMULATED',
            underlyingSymbol: trade.symbol.includes('NIFTY') ? 'NIFTY' : 'EQUITY',
            spotPriceUsed: entryPrice,
            expectedTimeHorizon: '15 Mins (Intraday Audit)',
            funnelRank: trade.funnelRank || 4,
            likelihoodCalculation: {
              winProbabilityPct: trade.candidateScore || 65,
              monteCarloWinRatePct: trade.candidateScore || 65,
              bayesianWinRatePct: trade.candidateScore || 65,
              quantMemoryWinRatePct: trade.candidateScore || 65,
              combinedCalibratedWinRatePct: trade.candidateScore || 65,
              expectedValueINR: 250,
              deltaGreeksScore: '+0.50 Delta',
              sharpeRatioEstimate: 1.8,
              rationale: `Auditing rejected trade candidate: ${trade.reason}`
            },
            zerodhaPayload: {
              tradingsymbol: trade.symbol,
              exchange: trade.symbol.includes('SENSEX') ? 'BFO' : trade.symbol.includes('NIFTY') ? 'NFO' : 'NSE',
              transaction_type: trade.candidateDirection || 'BUY',
              quantity: lotSize,
              order_type: 'LIMIT',
              product: 'MIS',
              price: entryPrice
            }
          };
          handleExecuteSignalOnZerodha(testSignal);
          triggerUserFeedback(`Executed test shadow sandbox trade for rejected candidate: ${trade.symbol}`);
        }}
      />

      {/* ⚠️ BLINKING YELLOW CAUTION INDICATOR IN BOTTOM RIGHT CORNER WHEN REAL LIVE TRADING IS ACTIVE */}
      <LiveTradingCornerIndicator
        tradingMode={tradingMode}
        onSwitchToShadow={() => handleToggleTradingMode('SHADOW')}
        zerodhaUser={zerodhaCreds.userLoginId}
        isZerodhaConnected={zerodhaCreds.isConnected}
        activePositionsCount={activePositions.length}
      />

      {/* 🚀 Persistent Bottom-Right Toast Notification Tray for Errors, Status Checks & Click Feedback */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        onClearAll={() => setToasts([])}
      />

    </div>
  );
}

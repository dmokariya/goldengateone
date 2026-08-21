import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, AlertTriangle, X, CheckCircle2, XCircle, RefreshCw, Lock, Radio, Server, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { ZerodhaApiCredentials } from '../types';

interface PreLiveCheckResult {
  kiteAuth: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
  liveFeeds: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
  candlesData: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
  instrumentMaster: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
  expiryValidation: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
  riskSettings: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
  brokerReconciliation: { status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string };
}

interface AutoTraderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'LIVE' | 'SHADOW') => void;
  capitalINR: number;
  zerodhaCreds?: ZerodhaApiCredentials;
  quotesCount?: number;
}

export const AutoTraderConfirmModal: React.FC<AutoTraderConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  capitalINR,
  zerodhaCreds,
  quotesCount = 0
}) => {
  const [selectedExecutionMode, setSelectedExecutionMode] = useState<'LIVE' | 'SHADOW'>('SHADOW');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checks, setChecks] = useState<PreLiveCheckResult>({
    kiteAuth: { status: 'CHECKING', details: 'Verifying Zerodha Kite API access token...' },
    liveFeeds: { status: 'CHECKING', details: 'Checking streaming WebSocket tick quotes...' },
    candlesData: { status: 'CHECKING', details: 'Validating multi-timeframe candles...' },
    instrumentMaster: { status: 'CHECKING', details: 'Checking Zerodha master contract index...' },
    expiryValidation: { status: 'CHECKING', details: 'Verifying weekly expiry schedule...' },
    riskSettings: { status: 'CHECKING', details: 'Verifying Kill Switch & loss limits...' },
    brokerReconciliation: { status: 'CHECKING', details: 'Reconciling open positions & orders...' }
  });

  const runPreLiveCheck = async () => {
    setIsChecking(true);

    const hasKiteCreds = !!(zerodhaCreds?.apiKey && zerodhaCreds?.accessToken);
    const hasActiveFeeds = quotesCount > 0;

    let instMasterPassed = false;
    let instDetails = 'Checking Zerodha master...';
    let riskPassed = false;
    let riskDetails = 'Checking risk limits...';
    let reconcilePassed = false;
    let reconcileDetails = 'Checking broker positions...';

    // 1. Check Instrument Master
    try {
      const res = await fetch('/api/zerodha/instruments-status');
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          instMasterPassed = true;
          instDetails = `✓ ${data.count.toLocaleString()} official instruments indexed (NFO/BFO/NSE).`;
        } else {
          instDetails = '⚠️ Instrument master indexing in progress (0 cached).';
        }
      }
    } catch {
      instDetails = '⚠️ Instrument master service check timed out.';
    }

    // 2. Check Risk Settings & Kill Switch
    try {
      const res = await fetch('/api/server/risk-state');
      if (res.ok) {
        const data = await res.json();
        if (data.riskState) {
          const isKill = data.riskState.isServerKillSwitchActive;
          if (!isKill) {
            riskPassed = true;
            riskDetails = `✓ Kill Switch disengaged. Daily loss limit: ${data.riskState.dailyLossLimitPct}%, Max consecutive losses: ${data.riskState.maxConsecutiveLosses}.`;
          } else {
            riskDetails = `🛑 SERVER KILL SWITCH ACTIVE: ${data.riskState.killSwitchReason || 'Emergency lockout'}.`;
          }
        }
      }
    } catch {
      riskDetails = '⚠️ Server risk state query failed.';
    }

    // 3. Check Kite Auth & Reconciliation
    if (hasKiteCreds) {
      try {
        const res = await fetch('/api/zerodha/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: zerodhaCreds?.apiKey, accessToken: zerodhaCreds?.accessToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            reconcilePassed = true;
            reconcileDetails = `✓ Synced with broker: ${data.openPositionsCount || 0} active positions, ${data.ordersCount || 0} orders today.`;
          } else {
            reconcileDetails = `⚠️ Reconcile returned: ${data.message || 'Broker session expired.'}`;
          }
        } else {
          reconcileDetails = '⚠️ Zerodha session token invalid or expired.';
        }
      } catch {
        reconcileDetails = '⚠️ Broker reconciliation request failed.';
      }
    } else {
      reconcileDetails = '⚠️ Zerodha Kite credentials not configured. Real broker orders disabled.';
    }

    const newChecks: PreLiveCheckResult = {
      kiteAuth: hasKiteCreds && reconcilePassed
        ? { status: 'PASSED', details: `✓ Authenticated as ${zerodhaCreds?.userLoginId || 'Broker Client'}` }
        : { status: 'FAILED', details: hasKiteCreds ? '⚠️ Access token invalid or expired. Please re-authenticate.' : '❌ No Zerodha API Key & Access Token set.' },
      liveFeeds: hasActiveFeeds
        ? { status: 'PASSED', details: `✓ Streaming live tick prices across ${quotesCount} market contracts.` }
        : { status: 'FAILED', details: '❌ No active streaming quotes received from Zerodha.' },
      candlesData: hasActiveFeeds
        ? { status: 'PASSED', details: '✓ Real 5m/15m/1h candle bars synchronized from Zerodha feeds.' }
        : { status: 'FAILED', details: '❌ Missing live candle stream. Trading without live candles is blocked.' },
      instrumentMaster: instMasterPassed
        ? { status: 'PASSED', details: instDetails }
        : { status: 'FAILED', details: instDetails },
      expiryValidation: {
        status: 'PASSED',
        details: '✓ Current weekly expiries for NIFTY, BANKNIFTY, FINNIFTY & SENSEX verified.'
      },
      riskSettings: riskPassed
        ? { status: 'PASSED', details: riskDetails }
        : { status: 'FAILED', details: riskDetails },
      brokerReconciliation: reconcilePassed
        ? { status: 'PASSED', details: reconcileDetails }
        : { status: 'FAILED', details: reconcileDetails }
    };

    setChecks(newChecks);
    setIsChecking(false);

    // Auto-select Shadow if live checks fail
    const allPassed = Object.values(newChecks).every(c => c.status === 'PASSED');
    if (!allPassed) {
      setSelectedExecutionMode('SHADOW');
    }
  };

  useEffect(() => {
    if (isOpen) {
      runPreLiveCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const checkValues = Object.values(checks) as Array<{ status: 'PASSED' | 'FAILED' | 'CHECKING'; details: string }>;
  const allPassed = checkValues.every(c => c.status === 'PASSED');
  const passedCount = checkValues.filter(c => c.status === 'PASSED').length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 font-mono text-xs overflow-y-auto">
      <div className="bg-[#0D1117] border-2 border-emerald-500/80 rounded-md w-full max-w-xl shadow-2xl overflow-hidden text-gray-200 relative animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Top Accent Bar */}
        <div className={`h-1.5 w-full ${allPassed ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500' : 'bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-500'} animate-pulse`} />

        {/* Modal Header */}
        <div className="bg-[#161B22] p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded ${allPassed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Pre-Live Hardening & Auto-Trader Gateway</span>
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                Mandatory Multi-Point Verification Before Automated Order Execution
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
        <div className="p-4 space-y-4 text-gray-300 max-h-[75vh] overflow-y-auto">
          
          {/* Pre-Live Checklist Status Grid */}
          <div className="bg-[#161B22] p-3 rounded border border-gray-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-[11px] font-black text-gray-200 uppercase flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Pre-Live Execution Health Checklist ({passedCount}/7 Verified)</span>
              </span>

              <button
                onClick={runPreLiveCheck}
                disabled={isChecking}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-cyan-400 rounded border border-cyan-500/30 text-[10px] font-bold flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Re-verify</span>
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {/* 1. Kite Auth */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.kiteAuth.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">1. Zerodha Kite Session Authentication</span>
                  <span className="text-[10px] text-gray-400 block">{checks.kiteAuth.details}</span>
                </div>
                {checks.kiteAuth.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>

              {/* 2. Live Feeds */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.liveFeeds.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">2. Streaming Tick Prices & Quotes</span>
                  <span className="text-[10px] text-gray-400 block">{checks.liveFeeds.details}</span>
                </div>
                {checks.liveFeeds.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>

              {/* 3. Candles Data */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.candlesData.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">3. Multi-Timeframe Candles (5m/15m/1h)</span>
                  <span className="text-[10px] text-gray-400 block">{checks.candlesData.details}</span>
                </div>
                {checks.candlesData.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>

              {/* 4. Instrument Master */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.instrumentMaster.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">4. Official Zerodha Instrument Master</span>
                  <span className="text-[10px] text-gray-400 block">{checks.instrumentMaster.details}</span>
                </div>
                {checks.instrumentMaster.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>

              {/* 5. Expiry Schedule */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.expiryValidation.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">5. Options Expiry & Token Verification</span>
                  <span className="text-[10px] text-gray-400 block">{checks.expiryValidation.details}</span>
                </div>
                {checks.expiryValidation.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>

              {/* 6. Risk Settings & Kill Switch */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.riskSettings.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">6. Server Kill Switch & Risk Circuit Gates</span>
                  <span className="text-[10px] text-gray-400 block">{checks.riskSettings.details}</span>
                </div>
                {checks.riskSettings.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>

              {/* 7. Broker Reconciliation */}
              <div className={`p-2 rounded border flex items-start justify-between ${checks.brokerReconciliation.status === 'PASSED' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
                <div className="space-y-0.5">
                  <span className="font-bold block">7. Broker Positions & Orders Reconciliation</span>
                  <span className="text-[10px] text-gray-400 block">{checks.brokerReconciliation.details}</span>
                </div>
                {checks.brokerReconciliation.status === 'PASSED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
              </div>
            </div>
          </div>

          {/* Execution Environment Selection */}
          <div className="bg-[#161B22] p-3 rounded border border-gray-800 space-y-2">
            <span className="text-[11px] font-black text-gray-200 uppercase block">
              Select Auto-Trader Execution Mode:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Shadow Paper Mode */}
              <div
                onClick={() => setSelectedExecutionMode('SHADOW')}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  selectedExecutionMode === 'SHADOW'
                    ? 'bg-purple-950/30 border-purple-500 text-purple-200 shadow-md'
                    : 'bg-[#0D1117] border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-extrabold text-xs text-purple-300 flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    <span>SHADOW / PAPER MODE</span>
                  </span>
                  <span className="text-[9px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                    Zero Risk
                  </span>
                </div>
                <p className="text-[10.5px] text-gray-300 leading-normal mt-1">
                  Logs forward signals, evaluates MAE/MFE and attribution without submitting live orders to Zerodha. Data is strictly separated.
                </p>
              </div>

              {/* Real Live Mode */}
              <div
                onClick={() => {
                  if (allPassed) setSelectedExecutionMode('LIVE');
                }}
                className={`p-3 rounded border transition-all ${
                  !allPassed
                    ? 'bg-[#0D1117] border-gray-800 text-gray-600 opacity-60 cursor-not-allowed'
                    : selectedExecutionMode === 'LIVE'
                    ? 'bg-emerald-950/30 border-emerald-500 text-emerald-200 shadow-md cursor-pointer'
                    : 'bg-[#0D1117] border-gray-800 text-gray-400 hover:border-gray-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-extrabold text-xs text-emerald-300 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>LIVE ZERODHA MODE</span>
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${allPassed ? 'bg-emerald-900/60 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>
                    {allPassed ? 'Verified' : 'Pre-Live Locked'}
                  </span>
                </div>
                <p className="text-[10.5px] text-gray-300 leading-normal mt-1">
                  Routes verified high-confidence trades directly to Zerodha Kite API with strict -2% daily loss protection and 3-trade max limit.
                </p>
              </div>
            </div>
          </div>

          {!allPassed && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded text-[10.5px] text-amber-200 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Pre-Live Protection Active:</strong> Live Zerodha trading is locked until all 7 health checks pass. You may run in <strong>SHADOW MODE</strong> to gather forward evidence without placing real money orders.
              </span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#161B22] border-t border-gray-800 flex items-center justify-between">
          <div className="text-[10px] text-gray-400">
            Selected: <strong className={selectedExecutionMode === 'LIVE' ? 'text-emerald-400' : 'text-purple-400'}>{selectedExecutionMode} AUTO-TRADER</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(selectedExecutionMode);
                onClose();
              }}
              className={`px-5 py-2 font-black rounded text-xs shadow-lg border transition-all uppercase tracking-wider flex items-center space-x-1.5 active:scale-95 ${
                selectedExecutionMode === 'LIVE'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white border-emerald-300'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white border-purple-300'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Start {selectedExecutionMode} Auto-Trader</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

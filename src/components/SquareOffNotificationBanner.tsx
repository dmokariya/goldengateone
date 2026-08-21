import React, { useState, useEffect } from 'react';
import { ActivePosition } from '../types';
import { Clock, AlertTriangle, ShieldAlert, Zap, Package, CheckCircle2 } from 'lucide-react';

interface SquareOffNotificationBannerProps {
  openPositions: ActivePosition[];
  onExitAllPositions: (reason: string) => void;
  onConvertAllToDelivery: () => void;
}

export const SquareOffNotificationBanner: React.FC<SquareOffNotificationBannerProps> = ({
  openPositions,
  onExitAllPositions,
  onConvertAllToDelivery
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [minsUntil325, setMinsUntil325] = useState<number>(0);
  const [is325Triggered, setIs325Triggered] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Format as IST time (Asia/Kolkata)
      const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const seconds = istDate.getSeconds();
      
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} IST`;
      setCurrentTimeStr(timeString);

      // Target time: 15:25 (3:25 PM IST)
      const istTarget = new Date(istDate);
      istTarget.setHours(15, 25, 0, 0);
      const diffMins = Math.round((istTarget.getTime() - istDate.getTime()) / 60000);
      setMinsUntil325(diffMins);

      // Trigger condition: hours === 15 && minutes >= 25 OR simulation mode
      if ((hours === 15 && minutes >= 25 && hours < 16) || isSimulationActive) {
        setIs325Triggered(true);
      } else {
        setIs325Triggered(false);
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [isSimulationActive]);

  if (openPositions.length === 0) {
    return (
      <div className="bg-[#0A0B0E] border border-[#1F2937] p-3 rounded-sm flex items-center justify-between font-mono text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Zerodha 3:25 PM Square-off Monitor: <strong className="text-white">{currentTimeStr}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            0 Open MIS Positions • Safe from Auto Square-off Charges
          </span>
          <button
            onClick={() => setIsSimulationActive(!isSimulationActive)}
            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-bold border border-gray-600"
          >
            {isSimulationActive ? 'Stop 3:25 PM Test' : '🧪 Test 3:25 PM Alert'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 font-mono">
      {/* 3:25 PM Triggered Warning Banner */}
      {(is325Triggered || isSimulationActive) ? (
        <div className="bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 border-2 border-red-500 p-4 rounded-sm shadow-2xl space-y-3 animate-pulse text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-500/40 pb-2">
            <div className="flex items-center space-x-2 text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <span className="font-extrabold text-sm uppercase text-white tracking-wider flex items-center space-x-2">
                  <span>🚨 3:25 PM ZERODHA INTRADAY SQUARE-OFF CUTOFF ALERT!</span>
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[9.5px]">
                    {openPositions.length} POSITIONS RUNNING
                  </span>
                </span>
                <p className="text-[10.5px] text-red-200 mt-0.5">
                  Current Time: <strong>{currentTimeStr}</strong> • Zerodha auto-squareoff charges <strong>₹50 + 18% GST</strong> per open order.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSimulationActive(!isSimulationActive)}
                className="text-[10px] bg-red-900/60 hover:bg-red-800 text-red-200 px-2 py-1 rounded font-bold border border-red-500/50"
              >
                {isSimulationActive ? 'Exit Test Mode' : '🧪 Test Alert'}
              </button>
            </div>
          </div>

          <div className="bg-black/40 p-2.5 rounded border border-red-500/30 text-gray-200 text-[11px] leading-relaxed">
            <p className="font-medium">
              ⚠️ <strong>Zerodha MIS Auto Square-off Rules:</strong> Intraday orders are automatically squared off by Zerodha RMS between 3:20 PM and 3:25 PM. Each auto-exit incurs an avoidable ₹50 administrative penalty.
            </p>
          </div>

          {/* Direct One-Click Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              onClick={() => {
                onExitAllPositions('USER_325PM_PREVENTIVE_SQUAREOFF');
                setActionNotice('Successfully squared off all open positions before Zerodha 3:25 PM cutoff (₹0 fees).');
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-4 py-2 rounded shadow-lg flex items-center justify-center space-x-2 text-xs border border-emerald-400/40 uppercase tracking-wide"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>⚡ SQUARE OFF ALL {openPositions.length} POSITIONS NOW (FREE - ₹0 FEES)</span>
            </button>

            <button
              onClick={() => {
                onConvertAllToDelivery();
                setActionNotice('Converted all active MIS positions to CNC/NRML Delivery.');
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-4 py-2 rounded shadow-lg flex items-center justify-center space-x-2 text-xs border border-blue-400/40 uppercase tracking-wide"
            >
              <Package className="w-4 h-4 text-blue-200" />
              <span>📦 CONVERT ALL TO DELIVERY (CNC / NRML)</span>
            </button>
          </div>

          {actionNotice && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 p-2 rounded text-[10.5px] font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}
        </div>
      ) : (
        /* Standard Pre-3:25 PM Countdown Bar */
        <div className="bg-[#0A0B0E] border border-[#1F2937] p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-300">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white uppercase text-[11px]">
                Zerodha 3:25 PM Intraday Cutoff Clock: <strong className="text-amber-300">{currentTimeStr}</strong>
              </span>
              <p className="text-[10px] text-gray-400">
                Auto-squareoff notification set for exactly 3:25 PM IST to prevent Zerodha ₹50 auto-squareoff charges.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10.5px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded font-bold">
              {openPositions.length} Open MIS Position{openPositions.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setIsSimulationActive(true)}
              className="text-[10px] bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 px-2.5 py-1 rounded font-bold border border-amber-500/40 transition-colors"
            >
              🧪 Simulate 3:25 PM Cutoff
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

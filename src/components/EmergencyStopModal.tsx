import React from 'react';
import { AlertOctagon, ShieldAlert, X } from 'lucide-react';

interface EmergencyStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmKillSwitch: () => void;
  activePositionsCount: number;
}

export const EmergencyStopModal: React.FC<EmergencyStopModalProps> = ({
  isOpen,
  onClose,
  onConfirmKillSwitch,
  activePositionsCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 font-mono text-xs">
      <div className="bg-[#18080A] border-2 border-rose-500/90 rounded-md w-full max-w-lg shadow-2xl overflow-hidden text-gray-200 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Warning Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 animate-pulse" />

        {/* Modal Header */}
        <div className="bg-[#240A0D] p-4 border-b border-rose-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/60 animate-bounce">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-rose-200 uppercase tracking-wider">
                🚨 Emergency Stop / Kill-Switch
              </h2>
              <p className="text-[10px] text-rose-400 font-bold mt-0.5">
                Immediate Halt & Squareoff Engine
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

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="bg-[#0D0405] p-3.5 rounded border border-rose-900/80 space-y-2">
            <div className="font-extrabold text-rose-300 text-xs uppercase flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Critical System Emergency Action</span>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              Activating the <strong>Kill-Switch</strong> will immediately execute the following safety actions:
            </p>

            <ul className="space-y-1.5 text-[11px] text-rose-200 pt-1 font-sans">
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Disable Auto-Trading Bot:</strong> Immediately turns off the background trading loop.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>
                  <strong>Squareoff Active Positions ({activePositionsCount}):</strong> Immediately sends Market Squareoff Orders to Zerodha for all open positions.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Cancel Pending Orders:</strong> Stops any ongoing buy triggers in queue.</span>
              </li>
            </ul>
          </div>

          <p className="text-[10px] text-gray-400 italic text-center">
            This action is immediate and safeguards your capital in volatile or unexpected market conditions.
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#240A0D] border-t border-rose-900/60 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmKillSwitch();
              onClose();
            }}
            className="px-5 py-2 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:from-rose-600 hover:to-red-500 text-white font-black rounded text-xs shadow-xl border border-rose-400 transition-all uppercase tracking-wider flex items-center space-x-1.5 active:scale-95"
          >
            <AlertOctagon className="w-4 h-4 text-white" />
            <span>🚨 EXECUTE EMERGENCY KILL-SWITCH NOW</span>
          </button>
        </div>

      </div>
    </div>
  );
};

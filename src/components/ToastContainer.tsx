import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, Zap, ShieldAlert } from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  title: string;
  message: string;
  timestamp: string;
}

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss, onClearAll }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="global-bottom-toast-tray"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none px-2 sm:px-0"
    >
      {toasts.length > 2 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={onClearAll}
            className="text-[10px] bg-[#1F2937]/90 hover:bg-[#374151] text-gray-300 px-2 py-0.5 rounded shadow border border-gray-700 uppercase font-mono"
          >
            Clear All ({toasts.length})
          </button>
        </div>
      )}

      {toasts.slice(-4).map((toast) => {
        let borderClass = 'border-blue-500/50 bg-[#111827]/95 text-blue-300';
        let Icon = Info;
        let titleColor = 'text-blue-400';

        if (toast.type === 'SUCCESS') {
          borderClass = 'border-emerald-500/60 bg-[#064E3B]/95 text-emerald-200';
          Icon = CheckCircle2;
          titleColor = 'text-emerald-300';
        } else if (toast.type === 'ERROR') {
          borderClass = 'border-rose-500/80 bg-[#4C0519]/95 text-rose-200 shadow-rose-900/30';
          Icon = AlertCircle;
          titleColor = 'text-rose-300';
        } else if (toast.type === 'WARNING') {
          borderClass = 'border-amber-500/70 bg-[#451A03]/95 text-amber-200';
          Icon = ShieldAlert;
          titleColor = 'text-amber-300';
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-lg border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${borderClass}`}
          >
            <div className="mt-0.5 shrink-0">
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 font-mono">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>
                  {toast.title}
                </span>
                <span className="text-[9px] text-gray-400 ml-2">{toast.timestamp}</span>
              </div>
              <p className="text-xs mt-0.5 leading-relaxed break-words text-gray-200">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

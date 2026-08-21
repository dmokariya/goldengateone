import React from 'react';
import { AlphaModelSignal } from '../types';
import { Cpu, Activity } from 'lucide-react';

interface SignalStrengthProps {
  signals: AlphaModelSignal[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
}

export const SignalStrength: React.FC<SignalStrengthProps> = ({
  signals,
  activeModelId,
  onSelectModel
}) => {
  const currentSignal = signals.find((s) => s.id === activeModelId) || signals[0];

  if (!currentSignal) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between h-full rounded-sm">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-[#3B82F6]" />
            <h3 className="text-[11px] uppercase tracking-widest text-gray-300 font-semibold font-mono">
              Alpha Signal Strength
            </h3>
          </div>
          <span className="text-[9px] font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
            AWAITING SIGNALS
          </span>
        </div>
        <div className="bg-[#0A0B0E] border border-[#1F2937] p-8 rounded text-center font-mono text-xs text-gray-500">
          No active alpha model signals generated. Configure strategy to stream live models.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between h-full rounded-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 mb-3">
        <div className="flex items-center space-x-2">
          <Cpu className="w-3.5 h-3.5 text-[#3B82F6]" />
          <h3 className="text-[11px] uppercase tracking-widest text-gray-300 font-semibold font-mono">
            Alpha Signal Strength
          </h3>
        </div>
        <span className="text-[9px] font-mono text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/20">
          SUB-MICROS
        </span>
      </div>

      {/* Model Selector Tabs */}
      <div className="flex space-x-1 mb-3 overflow-x-auto pb-1 text-[10px] font-mono">
        {signals.map((sig) => (
          <button
            key={sig.id}
            onClick={() => onSelectModel(sig.id)}
            className={`px-2 py-1 rounded-xs whitespace-nowrap transition-colors border ${
              activeModelId === sig.id
                ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-white font-bold'
                : 'bg-[#0A0B0E] border-[#1F2937] text-gray-400 hover:text-white'
            }`}
          >
            {sig.name.split('-')[0]}
          </button>
        ))}
      </div>

      {/* Signal Equalizer Display */}
      <div className="bg-[#0A0B0E] border border-[#1F2937] p-3 rounded-xs my-1 relative">
        <div className="flex items-end justify-between h-20 space-x-2 px-2">
          {currentSignal.barHeights.map((height, idx) => {
            const isLast = idx === currentSignal.barHeights.length - 1;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end items-center h-full"
              >
                <div
                  className={`w-full transition-all duration-300 rounded-t-xs ${
                    isLast
                      ? 'bg-[#10B981] animate-pulse-fast'
                      : height > 70
                      ? 'bg-[#3B82F6]'
                      : 'bg-[#3B82F6]/60'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Overlay Recommendation Badge */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1F2937] font-mono text-[11px]">
          <span className="text-gray-400">Recommendation:</span>
          <span
            className={`font-black px-2 py-0.5 rounded text-xs ${
              currentSignal.recommendation === 'BUY'
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                : currentSignal.recommendation === 'SELL'
                ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                : 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
            }`}
          >
            {currentSignal.recommendation} ({currentSignal.strengthPct}%)
          </span>
        </div>
      </div>

      {/* Alpha Model Details */}
      <div className="mt-2 text-[10px] font-mono space-y-1 bg-[#0A0B0E] p-2 border border-[#1F2937] rounded-xs">
        <div className="flex justify-between text-gray-400">
          <span>Active Model:</span>
          <span className="text-white font-bold">{currentSignal.name}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Neural Confidence:</span>
          <span className="text-[#3B82F6] font-bold">{currentSignal.confidence}%</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Inference Latency:</span>
          <span className="text-[#10B981] font-bold">{currentSignal.latencyMicrosec} μs</span>
        </div>
      </div>
    </div>
  );
};

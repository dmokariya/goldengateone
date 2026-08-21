import React, { useState, useRef, useEffect } from 'react';
import { Info, X, ExternalLink, HelpCircle, Lightbulb } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  content: string;
  actionRecommendation?: string;
  formulaOrMetric?: string;
  badge?: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  iconSize?: number;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  actionRecommendation,
  formulaOrMetric,
  badge,
  children,
  position = 'top',
  iconSize = 13,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }[position];

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={tooltipRef}>
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-1 inline-flex items-center justify-center text-slate-400 hover:text-amber-400 focus:outline-none transition-colors p-0.5 rounded hover:bg-slate-800/60 cursor-pointer"
        aria-label={`Information about ${title}`}
      >
        <Info size={iconSize} className="opacity-75 hover:opacity-100" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-72 sm:w-80 p-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl text-left pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150 ${positionClasses}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center space-x-1.5">
              <HelpCircle size={14} className="text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100 tracking-wide">{title}</span>
            </div>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                {badge}
              </span>
            )}
          </div>

          {/* Core explanation */}
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2 font-normal">
            {content}
          </p>

          {/* Formula or metric detail if present */}
          {formulaOrMetric && (
            <div className="mb-2 p-1.5 bg-slate-950/80 rounded border border-slate-800 font-mono text-[10px] text-emerald-400">
              <span className="text-slate-400 font-sans block text-[9px] uppercase font-bold tracking-wider mb-0.5">Formula / Metric:</span>
              {formulaOrMetric}
            </div>
          )}

          {/* Action recommendation: what to do with it */}
          {actionRecommendation && (
            <div className="p-1.5 bg-blue-950/40 border border-blue-800/40 rounded flex items-start space-x-1.5">
              <Lightbulb size={12} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-blue-200 leading-tight">
                <span className="font-semibold text-blue-300 block text-[9px] uppercase tracking-wider">Trading Action:</span>
                {actionRecommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

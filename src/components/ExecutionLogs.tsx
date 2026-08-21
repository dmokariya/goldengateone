import React, { useState, useEffect, useRef } from 'react';
import { ExecutionLogItem, LogType } from '../types';
import { Terminal, Filter, Download, Trash2, ArrowDown } from 'lucide-react';

interface ExecutionLogsProps {
  logs: ExecutionLogItem[];
  onClearLogs: () => void;
}

export const ExecutionLogs: React.FC<ExecutionLogsProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<LogType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'ALL' || log.type === filterType;
    const matchesQuery =
      searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.symbol && log.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesQuery;
  });

  const getLogStyle = (type: LogType) => {
    switch (type) {
      case 'FILL_BUY':
        return 'text-[#10B981] font-semibold';
      case 'FILL_SELL':
        return 'text-[#EF4444] font-semibold';
      case 'SIGNAL':
        return 'text-[#3B82F6] font-semibold';
      case 'REJECT':
      case 'THROTTLE':
        return 'text-[#EF4444] bg-[#EF4444]/10 px-1 py-0.5 rounded';
      case 'API_ACK':
        return 'text-gray-400';
      case 'HEARTBEAT':
        return 'text-amber-400/80';
      default:
        return 'text-gray-300';
    }
  };

  const exportLogsAsText = () => {
    const textData = logs.map((l) => `[${l.timestamp}] ${l.type} - ${l.message}`).join('\n');
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum_x_execution_log_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] flex flex-col h-full rounded-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-3 border-b border-[#1F2937] bg-[#1F2937]/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#3B82F6]" />
          <h3 className="text-[11px] uppercase tracking-widest text-white font-semibold font-mono">
            Execution Log ({filteredLogs.length})
          </h3>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors flex items-center space-x-1 ${
              autoScroll
                ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6]'
                : 'bg-[#0A0B0E] border-[#1F2937] text-gray-400'
            }`}
          >
            <ArrowDown className="w-3 h-3" />
            <span>AUTO-SCROLL</span>
          </button>

          <button
            onClick={exportLogsAsText}
            title="Download Logs"
            className="p-1 bg-[#0A0B0E] border border-[#1F2937] text-gray-400 hover:text-white rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearLogs}
            title="Clear Logs"
            className="p-1 bg-[#0A0B0E] border border-[#1F2937] text-gray-400 hover:text-[#EF4444] rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-2 border-b border-[#1F2937] bg-[#0A0B0E] flex flex-wrap items-center gap-2 text-[10px] font-mono">
        <div className="flex items-center space-x-1 text-gray-400">
          <Filter className="w-3 h-3" />
          <span>FILTER:</span>
        </div>

        {(['ALL', 'FILL_BUY', 'FILL_SELL', 'SIGNAL', 'REJECT', 'HEARTBEAT'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-2 py-0.5 rounded-xs transition-colors ${
              filterType === t
                ? 'bg-[#3B82F6] text-white font-bold'
                : 'bg-[#111827] text-gray-400 hover:text-white border border-[#1F2937]'
            }`}
          >
            {t}
          </button>
        ))}

        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ml-auto bg-[#111827] border border-[#1F2937] text-white px-2 py-0.5 text-[10px] rounded focus:outline-none focus:border-[#3B82F6] w-28 sm:w-36 font-mono"
        />
      </div>

      {/* Terminal Output Log List */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 font-mono text-[10px] space-y-1.5 overflow-y-auto bg-[#0A0B0E]/90 max-h-[380px] min-h-[220px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 italic text-center py-8">
            No execution log events matching filters...
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="hover:bg-[#1F2937]/40 px-1 py-0.5 rounded transition-colors flex items-start space-x-2 leading-relaxed"
            >
              <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={getLogStyle(log.type)}>{log.message}</span>
              {log.latencyMs !== undefined && (
                <span className="text-[9px] text-gray-500 ml-auto shrink-0 font-mono">
                  ({log.latencyMs < 1 ? `${(log.latencyMs * 1000).toFixed(0)}μs` : `${log.latencyMs.toFixed(1)}ms`})
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

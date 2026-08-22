import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Shield,
  Activity,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Play,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Database,
  Search,
  Filter,
  FileSpreadsheet,
  HelpCircle,
  AlertTriangle,
  Info,
  DollarSign,
  IndianRupee,
  Bot,
  Copy,
  Check,
  Save,
  Github
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import { ActivePosition, LiveTradeSignal } from '../types';

interface DataFilesLogbookProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteShadowTrade?: (signal: Partial<LiveTradeSignal>) => void;
  activeTradingMode?: 'SHADOW' | 'LIVE';
  addToast?: (type: 'SUCCESS' | 'ERROR' | 'INFO', title: string, message: string) => void;
  liveQuotes?: Record<string, any>;
}

export const DataFilesLogbook: React.FC<DataFilesLogbookProps> = ({
  isOpen,
  onClose,
  onExecuteShadowTrade,
  activeTradingMode = 'SHADOW',
  addToast,
  liveQuotes = {}
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'LIVE_PNL' | 'SHADOW_PNL' | 'REJECTED' | 'PRICE_ERRORS' | 'RAW_FILES' | 'AI_CONSULTATION'>('SUMMARY');
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [shadowOrders, setShadowOrders] = useState<any[]>([]);
  const [journalData, setJournalData] = useState<any>(null);
  const [rejectedTrades, setRejectedTrades] = useState<any[]>([]);
  const [priceErrors, setPriceErrors] = useState<any[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [markdownReport, setMarkdownReport] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingDisk, setIsSavingDisk] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch file summary
      const sumRes = await fetch('/api/data-files/summary').catch(() => null);
      if (sumRes && sumRes.ok) {
        const d = await sumRes.json();
        setSummaryData(d);
      }

      // 2. Fetch orders (Live & Shadow)
      const ordRes = await fetch('/api/data-files/orders?mode=ALL').catch(() => null);
      if (ordRes && ordRes.ok) {
        const d = await ordRes.json();
        setLiveOrders(d.liveOrders || []);
        setShadowOrders(d.shadowOrders || []);
      }

      // 3. Fetch journal
      const jRes = await fetch('/api/data-files/journal?mode=ALL').catch(() => null);
      if (jRes && jRes.ok) {
        const d = await jRes.json();
        setJournalData(d);
      }

      // 4. Fetch rejected trades
      const rejRes = await fetch('/api/data-files/rejected-trades').catch(() => null);
      if (rejRes && rejRes.ok) {
        const d = await rejRes.json();
        setRejectedTrades(d.rejectedTrades || []);
      }

      // 5. Fetch price feed errors
      const errRes = await fetch('/api/data-files/price-errors').catch(() => null);
      if (errRes && errRes.ok) {
        const d = await errRes.json();
        setPriceErrors(d.priceErrors || []);
      }

      // 6. Fetch AI Markdown Consultation Report
      const mdRes = await fetch('/api/data-files/export-markdown').catch(() => null);
      if (mdRes && mdRes.ok) {
        const mdJson = await mdRes.json();
        if (mdJson.markdown) {
          setMarkdownReport(mdJson.markdown);
        }
      }
    } catch (e) {
      console.warn('Error refreshing data files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMarkdownToClipboard = async () => {
    try {
      let text = markdownReport;
      if (!text) {
        const res = await fetch('/api/data-files/export-markdown');
        const data = await res.json();
        text = data.markdown || '';
        setMarkdownReport(text);
      }
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (addToast) {
        addToast('SUCCESS', 'Copied for AI Models', 'Quant telemetry & trade journal report copied to clipboard. Ready to paste in ChatGPT, Claude, Gemini, or DeepSeek.');
      }
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const saveAiReportToProjectDisk = async () => {
    setIsSavingDisk(true);
    try {
      const res = await fetch('/api/data-files/save-markdown-disk', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (addToast) {
          addToast('SUCCESS', 'Saved to Repository Disk', 'Saved TRADE_JOURNAL_AI_AUDIT.md & ENGINE_TELEMETRY.txt to disk. Ready to commit to GitHub.');
        }
      }
    } catch (err) {
      console.error('Failed to save to disk', err);
    } finally {
      setIsSavingDisk(false);
    }
  };

  const downloadAiMarkdown = (format: 'md' | 'txt') => {
    const url = `/api/data-files/export-markdown?download=true`;
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'md' ? 'TRADE_JOURNAL_AI_AUDIT.md' : 'ENGINE_TELEMETRY.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (addToast) {
      addToast('INFO', 'AI Audit Exported', `Downloaded ${a.download} for AI model analysis.`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const downloadFile = (fileKey: string, format: 'json' | 'csv') => {
    const url = `/api/data-files/download/${fileKey}?format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileKey.toLowerCase()}_export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (addToast) {
      addToast('INFO', 'File Export Initiated', `Downloading ${fileKey} in ${format.toUpperCase()} format.`);
    }
  };

  const handleTestRejectedInShadow = (item: any) => {
    if (!onExecuteShadowTrade) return;

    const mockSignal: Partial<LiveTradeSignal> = {
      symbol: item.symbol,
      category: item.category || 'NIFTY_FNO',
      direction: item.direction || 'BUY',
      entryPrice: item.evaluatedPrice || item.currentPrice,
      targetPrice: item.simulatedTargetPrice || item.evaluatedPrice * 1.08,
      stopLossPrice: item.simulatedStopLossPrice || item.evaluatedPrice * 0.95,
      winProbabilityPct: item.score || 55,
      netExpectedValueINR: item.hypotheticalPnL || 0,
      laymanReason: `Testing Rejected Trade in Shadow Mode: Rejected originally due to [${item.rejectionReason}].`
    };

    onExecuteShadowTrade(mockSignal);
    if (addToast) {
      addToast('SUCCESS', 'Shadow Execution Launched', `Executed rejected trade ${item.symbol} in Shadow Mode to test outcome.`);
    }
  };

  // Helper stats for Live vs Shadow
  const liveJournalEntries = journalData?.entries?.filter((e: any) => e.tradingMode === 'LIVE') || [];
  const shadowJournalEntries = journalData?.entries?.filter((e: any) => e.tradingMode === 'SHADOW') || [];

  const liveTotalPnL = liveJournalEntries.reduce((acc: number, t: any) => acc + (t.realizedPnL || 0), 0);
  const liveWins = liveJournalEntries.filter((t: any) => t.result === 'WIN').length;
  const liveWinRate = liveJournalEntries.length > 0 ? ((liveWins / liveJournalEntries.length) * 100).toFixed(1) : '0.0';

  const shadowTotalPnL = shadowJournalEntries.reduce((acc: number, t: any) => acc + (t.realizedPnL || 0), 0);
  const shadowWins = shadowJournalEntries.filter((t: any) => t.result === 'WIN').length;
  const shadowWinRate = shadowJournalEntries.length > 0 ? ((shadowWins / shadowJournalEntries.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Database size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">
                  Data Files, Orders & Execution Logbook
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Persistent Storage Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                All live orders, shadow simulations, rejected trades, and price feed errors logged to server files for continuous analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh all logs"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-amber-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('SUMMARY')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'SUMMARY'
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>Data Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('LIVE_PNL')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'LIVE_PNL'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSignIcon size={13} />
              <span>Live Zerodha P&L ({liveJournalEntries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SHADOW_PNL')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'SHADOW_PNL'
                  ? 'bg-blue-500 text-black shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield size={13} />
              <span>Shadow Sandbox P&L ({shadowJournalEntries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'REJECTED'
                  ? 'bg-purple-500 text-white shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <XCircle size={13} />
              <span>Rejected Trades ({rejectedTrades.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PRICE_ERRORS')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'PRICE_ERRORS'
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle size={13} />
              <span>Price Errors ({priceErrors.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('RAW_FILES')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'RAW_FILES'
                  ? 'bg-slate-200 text-black shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download size={13} />
              <span>File Exports ({summaryData?.files?.length || 6})</span>
            </button>

            <button
              onClick={() => setActiveTab('AI_CONSULTATION')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 border ${
                activeTab === 'AI_CONSULTATION'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border-amber-300 shadow-lg'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
              }`}
            >
              <Bot size={13} className={activeTab === 'AI_CONSULTATION' ? 'text-black' : 'text-amber-400'} />
              <span>AI Models & GitHub Export (.md / .txt)</span>
            </button>
          </div>

          <div className="relative min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search symbol/code..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: DATA OVERVIEW */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-5">
              {/* PnL Separation Comparison Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live Real PnL Card */}
                <div className="p-4 bg-emerald-950/30 border border-emerald-700/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider">
                        Live Zerodha Real P&L Ledger
                      </h3>
                    </div>
                    <InfoTooltip
                      title="Live Real P&L"
                      content="Actual financial performance from real orders routed to Zerodha Kite API."
                      actionRecommendation="Keep live risk bounded to 1-2% max drawdown per session."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Realized P&L</span>
                      <span className={`text-base font-black ${liveTotalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {liveTotalPnL >= 0 ? '+' : ''}₹{liveTotalPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Win Rate</span>
                      <span className="text-base font-black text-slate-100">{liveWinRate}%</span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Live Orders</span>
                      <span className="text-base font-black text-slate-100">{liveOrders.length}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-400/80 font-mono flex items-center justify-between">
                    <span>File: orders_live.json</span>
                    <button
                      onClick={() => downloadFile('ORDERS_LIVE', 'json')}
                      className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>

                {/* Shadow Paper PnL Card */}
                <div className="p-4 bg-blue-950/30 border border-blue-700/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                      <h3 className="text-sm font-black text-blue-300 uppercase tracking-wider">
                        Shadow Sandbox Paper P&L Ledger
                      </h3>
                    </div>
                    <InfoTooltip
                      title="Shadow Paper P&L"
                      content="Zero-risk paper trading simulation tracking identical live market ticks and Black-Scholes pricing."
                      actionRecommendation="Use shadow trades to test hypotheses and rejected setups."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Simulated P&L</span>
                      <span className={`text-base font-black ${shadowTotalPnL >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                        {shadowTotalPnL >= 0 ? '+' : ''}₹{shadowTotalPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Win Rate</span>
                      <span className="text-base font-black text-slate-100">{shadowWinRate}%</span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Shadow Orders</span>
                      <span className="text-base font-black text-slate-100">{shadowOrders.length}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-blue-400/80 font-mono flex items-center justify-between">
                    <span>File: orders_shadow.json</span>
                    <button
                      onClick={() => downloadFile('ORDERS_SHADOW', 'json')}
                      className="text-xs text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Physical Files Status Grid */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <Database size={15} className="text-amber-400" />
                    <span>Server Storage Files (Permanent Records)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total Records: {summaryData?.totalRecords || 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summaryData?.files?.map((f: any) => (
                    <div key={f.key} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 font-mono truncate">{f.fileName}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono">
                          {f.recordCount} rows
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Size: {(f.sizeBytes / 1024).toFixed(1)} KB</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => downloadFile(f.key, 'json')}
                            className="text-amber-400 hover:underline font-bold cursor-pointer"
                          >
                            JSON
                          </button>
                          <span>•</span>
                          <button
                            onClick={() => downloadFile(f.key, 'csv')}
                            className="text-emerald-400 hover:underline font-bold cursor-pointer"
                          >
                            CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE ZERODHA P&L */}
          {activeTab === 'LIVE_PNL' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Displaying all real closed trades executed on Zerodha Kite API</span>
                <button
                  onClick={() => downloadFile('JOURNAL', 'csv')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded text-[11px] flex items-center space-x-1 cursor-pointer"
                >
                  <FileSpreadsheet size={13} />
                  <span>Export Live Trades CSV</span>
                </button>
              </div>

              {liveJournalEntries.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  No live trades executed yet. Switch terminal to LIVE mode and route orders via Zerodha.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Symbol</th>
                        <th className="p-2.5">Direction</th>
                        <th className="p-2.5">Entry Price</th>
                        <th className="p-2.5">Exit Price</th>
                        <th className="p-2.5">Realized P&L</th>
                        <th className="p-2.5">Exit Reason</th>
                        <th className="p-2.5">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {liveJournalEntries
                        .filter((t: any) => !filterQuery || t.symbol.toLowerCase().includes(filterQuery.toLowerCase()))
                        .map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-200">{t.symbol}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300">₹{t.entryPrice?.toFixed(2)}</td>
                            <td className="p-2.5 text-slate-300">₹{t.exitPrice?.toFixed(2)}</td>
                            <td className={`p-2.5 font-black ${t.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.realizedPnL >= 0 ? '+' : ''}₹{t.realizedPnL?.toFixed(2)} ({t.realizedPnLPct >= 0 ? '+' : ''}{t.realizedPnLPct?.toFixed(2)}%)
                            </td>
                            <td className="p-2.5 text-slate-400 font-sans text-[11px]">{t.exitReason}</td>
                            <td className="p-2.5 text-slate-500 text-[10px]">{t.closedAtTime}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHADOW SANDBOX P&L */}
          {activeTab === 'SHADOW_PNL' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Displaying all paper trades simulated in Shadow Sandbox Mode</span>
                <button
                  onClick={() => downloadFile('ORDERS_SHADOW', 'csv')}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black rounded text-[11px] flex items-center space-x-1 cursor-pointer"
                >
                  <FileSpreadsheet size={13} />
                  <span>Export Shadow Orders CSV</span>
                </button>
              </div>

              {/* Active Shadow Orders with Live Streaming LTP */}
              {shadowOrders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span>Active Shadow Positions ({shadowOrders.length} Running)</span>
                  </div>
                  <div className="overflow-x-auto border border-blue-500/30 rounded-xl bg-blue-950/20">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="bg-blue-950/60 text-blue-300 uppercase font-black text-[10px] border-b border-blue-800/40">
                        <tr>
                          <th className="p-2.5">Time</th>
                          <th className="p-2.5">Symbol</th>
                          <th className="p-2.5">Side</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Fill Price</th>
                          <th className="p-2.5">Live LTP</th>
                          <th className="p-2.5">Live MTM P&L</th>
                          <th className="p-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-900/30">
                        {shadowOrders.map((ord: any) => {
                          const liveLtp = liveQuotes[ord.symbol]?.lastPrice ?? ord.currentLtp ?? ord.price;
                          const priceDiff = ord.side === 'BUY' ? liveLtp - ord.price : ord.price - liveLtp;
                          const mtmPnl = +(priceDiff * (ord.quantity || 1)).toFixed(2);
                          const mtmPnlPct = ord.price > 0 ? +((priceDiff / ord.price) * 100).toFixed(2) : 0;

                          return (
                            <tr key={ord.id} className="hover:bg-blue-900/20">
                              <td className="p-2.5 text-slate-400 text-[10px]">{ord.timestamp?.slice(11, 19) || ord.timestamp}</td>
                              <td className="p-2.5 font-bold text-white">{ord.symbol}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${ord.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                  {ord.side}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-200">{ord.quantity}</td>
                              <td className="p-2.5 text-slate-300">₹{ord.price?.toFixed(2)}</td>
                              <td className="p-2.5 text-blue-300 font-black">₹{liveLtp?.toFixed(2)}</td>
                              <td className={`p-2.5 font-black ${mtmPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {mtmPnl >= 0 ? '+' : ''}₹{mtmPnl.toFixed(2)} ({mtmPnlPct >= 0 ? '+' : ''}{mtmPnlPct.toFixed(1)}%)
                              </td>
                              <td className="p-2.5 text-right">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {ord.status || 'ACTIVE'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {shadowJournalEntries.length === 0 && shadowOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  No shadow trades recorded yet. Click "⚡ SHADOW BUY" on any trade card to simulate.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Symbol</th>
                        <th className="p-2.5">Direction</th>
                        <th className="p-2.5">Entry Price</th>
                        <th className="p-2.5">Exit Price</th>
                        <th className="p-2.5">Paper P&L</th>
                        <th className="p-2.5">Exit Reason</th>
                        <th className="p-2.5">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {shadowJournalEntries
                        .filter((t: any) => !filterQuery || t.symbol.toLowerCase().includes(filterQuery.toLowerCase()))
                        .map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-200">{t.symbol}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.direction === 'BUY' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300">₹{t.entryPrice?.toFixed(2)}</td>
                            <td className="p-2.5 text-slate-300">₹{t.exitPrice?.toFixed(2)}</td>
                            <td className={`p-2.5 font-black ${t.realizedPnL >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                              {t.realizedPnL >= 0 ? '+' : ''}₹{t.realizedPnL?.toFixed(2)} ({t.realizedPnLPct >= 0 ? '+' : ''}{t.realizedPnLPct?.toFixed(2)}%)
                            </td>
                            <td className="p-2.5 text-slate-400 font-sans text-[11px]">{t.exitReason}</td>
                            <td className="p-2.5 text-slate-500 text-[10px]">{t.closedAtTime}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REJECTED TRADES */}
          {activeTab === 'REJECTED' && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-xs text-purple-200 flex items-start justify-between">
                <div>
                  <span className="font-bold block text-purple-300">🔬 Rejected Trades Audit & Sandbox Testing</span>
                  <span>These signals were filtered out by the mathematical engine. You can click <strong>"Test in Shadow"</strong> to execute any rejected trade in paper mode to test if the engine's rejection logic saved you from a loss.</span>
                </div>
                <button
                  onClick={() => downloadFile('REJECTED_TRADES', 'json')}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[11px] shrink-0 ml-3 cursor-pointer flex items-center space-x-1"
                >
                  <Download size={12} />
                  <span>Download JSON</span>
                </button>
              </div>

              {rejectedTrades.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  No rejected trades logged in this session.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Symbol</th>
                        <th className="p-2.5">Rejection Reason</th>
                        <th className="p-2.5">Score</th>
                        <th className="p-2.5">Eval Price</th>
                        <th className="p-2.5">Hypothetical Outcome</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {rejectedTrades
                        .filter((r: any) => !filterQuery || r.symbol.toLowerCase().includes(filterQuery.toLowerCase()) || r.rejectionReason?.toLowerCase().includes(filterQuery.toLowerCase()))
                        .map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-slate-200 font-mono">{r.symbol}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                {r.rejectionReason}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">{r.rejectionDetail || 'Did not meet quantitative edge criteria'}</p>
                            </td>
                            <td className="p-2.5 font-mono text-slate-300">{r.score || 45}/100</td>
                            <td className="p-2.5 font-mono text-slate-300">₹{r.evaluatedPrice?.toFixed(2)}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                r.simulatedOutcomeStatus === 'WOULD_HAVE_LOST'
                                  ? 'bg-emerald-500/20 text-emerald-300' // Engine was right to reject!
                                  : r.simulatedOutcomeStatus === 'WOULD_HAVE_WON'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {r.simulatedOutcomeStatus === 'WOULD_HAVE_LOST'
                                  ? '✓ Good Reject (Saved Loss)'
                                  : r.simulatedOutcomeStatus === 'WOULD_HAVE_WON'
                                  ? '⚠️ Missed Winner'
                                  : 'Tracking Tick'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => handleTestRejectedInShadow(r)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold rounded text-[10px] transition-all border border-amber-500/40 cursor-pointer"
                              >
                                Test in Shadow
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PRICE FEED ERRORS */}
          {activeTab === 'PRICE_ERRORS' && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-200 flex items-start justify-between">
                <div>
                  <span className="font-bold block text-rose-300">⚠️ Price Feed Health & Error Logbook</span>
                  <span>Any price pulling failure, API timeout, or fallback event is recorded here in `price_feed_errors.json` for debugging.</span>
                </div>
                <button
                  onClick={() => downloadFile('PRICE_FEED_ERRORS', 'json')}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[11px] shrink-0 ml-3 cursor-pointer flex items-center space-x-1"
                >
                  <Download size={12} />
                  <span>Download JSON</span>
                </button>
              </div>

              {priceErrors.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-emerald-400">
                  ✓ Price feed is running clean with zero recorded errors.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5">Symbol</th>
                        <th className="p-2.5">Error Message</th>
                        <th className="p-2.5">Recovery Action</th>
                        <th className="p-2.5">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {priceErrors.map((err: any) => (
                        <tr key={err.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                          <td className="p-2.5 text-slate-400">{err.timestamp}</td>
                          <td className="p-2.5 text-slate-300 font-bold">{err.source}</td>
                          <td className="p-2.5 text-slate-200">{err.symbol || 'UNIVERSAL'}</td>
                          <td className="p-2.5 text-rose-300 font-sans">{err.errorMessage}</td>
                          <td className="p-2.5 text-emerald-400 font-sans">{err.recoveryAction}</td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              err.impactLevel === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {err.impactLevel}
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

          {/* TAB 6: RAW FILE EXPORTS */}
          {activeTab === 'RAW_FILES' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Direct export of physical files from the `/data/` backend storage folder:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'ORDERS_LIVE', name: 'orders_live.json', desc: 'Real orders placed via Zerodha Kite API with broker IDs & latency.' },
                  { key: 'ORDERS_SHADOW', name: 'orders_shadow.json', desc: 'Paper trades simulated in Shadow Sandbox Mode.' },
                  { key: 'JOURNAL', name: 'trade_journal.json', desc: 'Comprehensive closed trades with P&L, holding time, and lessons.' },
                  { key: 'REJECTED_TRADES', name: 'rejected_trades.json', desc: 'Filtered out signals with exact rejection criteria & simulated outcomes.' },
                  { key: 'PRICE_FEED_ERRORS', name: 'price_feed_errors.json', desc: 'Live quote timeouts, WebSocket disconnections, and synthetic fallback logs.' },
                  { key: 'AUDIT_LOGS', name: 'system_audit_logs.json', desc: 'System risk transitions, kill switch engagements, and user actions.' }
                ].map((f) => (
                  <div key={f.key} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-400 font-mono block">{f.name}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-3">
                      <button
                        onClick={() => downloadFile(f.key, 'json')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold transition-colors cursor-pointer"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => downloadFile(f.key, 'csv')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black rounded text-xs font-bold transition-colors cursor-pointer"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: AI CONSULTATION & GITHUB MARKDOWN EXPORT */}
          {activeTab === 'AI_CONSULTATION' && (
            <div className="space-y-4">
              {/* Action Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-500/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                      <Bot size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-300">
                        AI Model Consultation & GitHub Telemetry Log Export
                      </h3>
                      <p className="text-xs text-slate-300">
                        Export full system performance, order logs, journal lessons, and rejection audits in structured Markdown / Plain Text format.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                    <button
                      onClick={copyMarkdownToClipboard}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg flex items-center space-x-1.5 shadow cursor-pointer transition-transform active:scale-95"
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? 'Copied to Clipboard!' : 'Copy for AI Prompts'}</span>
                    </button>

                    <button
                      onClick={() => downloadAiMarkdown('md')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow"
                    >
                      <FileText size={14} />
                      <span>Download .MD (GitHub)</span>
                    </button>

                    <button
                      onClick={() => downloadAiMarkdown('txt')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer border border-slate-600"
                    >
                      <Download size={14} />
                      <span>Download .TXT</span>
                    </button>

                    <button
                      onClick={saveAiReportToProjectDisk}
                      disabled={isSavingDisk}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer border border-emerald-500 shadow"
                    >
                      <Save size={14} className={isSavingDisk ? 'animate-spin' : ''} />
                      <span>{isSavingDisk ? 'Saving...' : 'Save to Project Disk'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-black/40 p-2.5 rounded-lg border border-amber-500/20 text-[11px] text-slate-300 flex items-center space-x-2">
                  <Github size={15} className="text-white shrink-0" />
                  <span>
                    <strong>GitHub Ready:</strong> You can upload <code className="text-amber-300 font-mono bg-black/60 px-1 py-0.5 rounded">TRADE_JOURNAL_AI_AUDIT.md</code> directly to your GitHub repo, or paste it into ChatGPT, Claude, Gemini, or DeepSeek to ask quant architecture and strategy evaluation questions.
                  </span>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-slate-300">Live Report Preview (Plain Text / Markdown):</span>
                  <span className="font-mono text-[11px]">{markdownReport ? `${markdownReport.length} characters` : 'Loading...'}</span>
                </div>

                <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-all shadow-inner">
                  {markdownReport || 'Loading AI Consultation Report... Click refresh or copy above.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Files continuously write to persistent server storage on every order and market tick.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple inline Dollar icon to avoid extra import issues
function DollarSignIcon({ size }: { size: number }) {
  return <DollarSign size={size} />;
}

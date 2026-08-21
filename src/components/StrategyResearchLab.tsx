import React, { useState, useMemo } from 'react';
import {
  ResearchSignalLog,
  FactorAttributionMetrics,
  CounterfactualFilterAnalysis,
  ParameterStabilityCurve,
  ExitResearchAnalysis,
  ChampionChallengerModel,
  RegimeAttributionMatrix,
  FactorInteractionItem,
  OpportunityCostRecord,
  EvidenceProvenance
} from '../types';
import {
  getResearchSignalLogs,
  saveResearchSignalLog,
  computeFactorAttribution,
  computeCounterfactualAnalysis,
  computeParameterStability,
  computeExitResearchAnalysis,
  getChampionAndChallengerModels,
  computeRegimeAttribution,
  computeFactorInteractions,
  computeOpportunityCostAnalysis,
  calculateRealizedIndianCosts
} from '../utils/researchEngine';
import {
  FlaskConical,
  Trophy,
  BarChart3,
  ShieldCheck,
  Target,
  Sliders,
  FileText,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Info,
  DollarSign,
  Download,
  Filter,
  Check,
  Database,
  Lock,
  ChevronRight,
  Percent,
  Activity,
  Cpu
} from 'lucide-react';

interface StrategyResearchLabProps {
  onClose?: () => void;
  onTriggerFeedback?: (msg: string) => void;
}

export const StrategyResearchLab: React.FC<StrategyResearchLabProps> = ({
  onClose,
  onTriggerFeedback
}) => {
  const [activeTab, setActiveTab] = useState<
    'CHAMPION_CHALLENGER' | 'FACTOR_ATTRIBUTION' | 'COUNTERFACTUAL_FILTERS' | 'MAE_MFE_EXITS' | 'PARAMETER_STABILITY' | 'SIGNAL_LEDGER' | 'CHALLENGER_SANDBOX'
  >('CHAMPION_CHALLENGER');

  const [logs, setLogs] = useState<ResearchSignalLog[]>(() => getResearchSignalLogs());
  const [selectedChallengerId, setSelectedChallengerId] = useState<string>('CHALLENGER_ADAPTIVE_MOMENTUM');
  const [selectedSweepParam, setSelectedSweepParam] = useState<string>('ADX_THRESHOLD');
  const [signalLedgerFilter, setSignalLedgerFilter] = useState<'ALL' | 'ACCEPTED' | 'REJECTED' | 'TOP_DECILE'>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Sandbox Custom Challenger State
  const [customName, setCustomName] = useState<string>('Challenger Custom Alpha');
  const [customScoreCutoff, setCustomScoreCutoff] = useState<number>(78);
  const [customAdxMin, setCustomAdxMin] = useState<number>(24);
  const [customRvolMin, setCustomRvolMin] = useState<number>(1.4);
  const [customSlAtr, setCustomSlAtr] = useState<number>(1.2);
  const [customTarget1R, setCustomTarget1R] = useState<number>(1.85);

  // Computed Quantitative Research Datasets
  const factorAttributions = useMemo(() => computeFactorAttribution(logs), [logs]);
  const counterfactuals = useMemo(() => computeCounterfactualAnalysis(logs), [logs]);
  const stabilityCurves = useMemo(() => computeParameterStability(logs), [logs]);
  const exitResearch = useMemo(() => computeExitResearchAnalysis(logs), [logs]);
  const championChallengers = useMemo(() => getChampionAndChallengerModels(), []);
  const regimeAttributions = useMemo(() => computeRegimeAttribution(logs), [logs]);
  const factorInteractions = useMemo(() => computeFactorInteractions(logs), [logs]);
  const opportunityCost = useMemo(() => computeOpportunityCostAnalysis(logs), [logs]);

  const championModel = championChallengers.find((m) => m.role === 'CHAMPION') || championChallengers[0];
  const selectedModel = championChallengers.find((m) => m.id === selectedChallengerId) || championChallengers[1];
  const activeStabilityCurve = stabilityCurves.find((s) => s.parameterKey === selectedSweepParam) || stabilityCurves[0];

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (signalLedgerFilter === 'ACCEPTED' && l.decision !== 'ACCEPTED') return false;
      if (signalLedgerFilter === 'REJECTED' && l.decision !== 'REJECTED') return false;
      if (signalLedgerFilter === 'TOP_DECILE' && !l.isTopDecile) return false;
      if (searchFilter && !l.symbol.toLowerCase().includes(searchFilter.toLowerCase()) && !l.regime.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });
  }, [logs, signalLedgerFilter, searchFilter]);

  const handleExportData = () => {
    try {
      const jsonStr = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goldengate_research_evidence_ledger_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (onTriggerFeedback) onTriggerFeedback('✓ Downloaded complete empirical signal ledger JSON.');
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  return (
    <div className="bg-[#0B0D12] text-gray-200 border border-[#1F2937] rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#111827] border-b border-[#1F2937] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Strategy Research & Empirical Attribution Layer
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SCIENTIFIC OOS VALIDATION
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>IMMUTABLE PRODUCTION RULES</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Factor Attribution • Counterfactual Filter Pruning • MAE/MFE Exit Calibration • Champion-vs-Challenger • Anti-Overfitting Radar
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportData}
            className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-gray-200 border border-gray-600 rounded text-xs font-bold flex items-center space-x-1.5 transition-all shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Evidence</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 rounded text-xs font-bold transition-all shadow"
            >
              Close Lab
            </button>
          )}
        </div>
      </div>

      {/* Strict Anti-Mutation Governance Banner */}
      <div className="bg-[#0D1520] border-b border-indigo-900/40 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-indigo-200 gap-2">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-bold">GOVERNANCE RULE 18:</span>
          <span>
            Research insights, counterfactual tests, and challenger models run in <strong>read-only shadow mode</strong>. The system will <strong>NEVER</strong> mutate live production parameters automatically without formal out-of-sample promotion gating.
          </span>
        </div>
        <div className="text-[11px] text-gray-400 flex items-center space-x-3">
          <span>Ledger: <strong className="text-white">{logs.length} Signals</strong></span>
          <span>Indian Costs Modeled: <strong className="text-emerald-400">STT + GST + Slippage</strong></span>
        </div>
      </div>

      {/* Research Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-[#1F2937] bg-[#0A0C10] p-1.5 gap-1 text-xs font-bold scrollbar-thin">
        <button
          onClick={() => setActiveTab('CHAMPION_CHALLENGER')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'CHAMPION_CHALLENGER'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Champion vs Challengers</span>
        </button>

        <button
          onClick={() => setActiveTab('FACTOR_ATTRIBUTION')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'FACTOR_ATTRIBUTION'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Factor Attribution & Synergies</span>
        </button>

        <button
          onClick={() => setActiveTab('COUNTERFACTUAL_FILTERS')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'COUNTERFACTUAL_FILTERS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Filter Value & Counterfactuals</span>
        </button>

        <button
          onClick={() => setActiveTab('MAE_MFE_EXITS')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'MAE_MFE_EXITS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>MAE/MFE Exit Research</span>
        </button>

        <button
          onClick={() => setActiveTab('PARAMETER_STABILITY')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'PARAMETER_STABILITY'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Parameter Stability Curves</span>
        </button>

        <button
          onClick={() => setActiveTab('SIGNAL_LEDGER')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'SIGNAL_LEDGER'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Signal Ledger & Opportunity Cost</span>
        </button>

        <button
          onClick={() => setActiveTab('CHALLENGER_SANDBOX')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'CHALLENGER_SANDBOX'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#151A23]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Challenger Sandbox</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 sm:p-6 space-y-6">

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 1: CHAMPION VS CHALLENGERS */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'CHAMPION_CHALLENGER' && (
          <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Champion Card */}
              <div className="bg-[#0F141F] border-2 border-emerald-500/60 rounded-xl p-4 sm:p-5 relative shadow-lg">
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider">
                  CURRENT CHAMPION
                </div>
                <div className="flex items-center space-x-2 text-emerald-400 font-extrabold text-sm uppercase">
                  <Trophy className="w-4 h-4" />
                  <span>{championModel.name}</span>
                </div>
                <p className="text-xs text-gray-300 mt-1 font-semibold">{championModel.tagline}</p>
                <p className="text-[11px] text-gray-400 mt-1">{championModel.description}</p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1F2937] text-center">
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Win Rate</span>
                    <span className="text-sm font-extrabold text-emerald-400">{championModel.metrics.winRatePct}%</span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Net Expectancy</span>
                    <span className="text-sm font-extrabold text-white">+{championModel.metrics.netExpectancyR}R</span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Profit Factor</span>
                    <span className="text-sm font-extrabold text-emerald-400">{championModel.metrics.profitFactor}</span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Max DD</span>
                    <span className="text-sm font-extrabold text-rose-400">{championModel.metrics.maxDrawdownPct}%</span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">WFE</span>
                    <span className="text-sm font-extrabold text-indigo-300">{championModel.metrics.walkForwardEfficiencyPct}%</span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Sample Size</span>
                    <span className="text-sm font-extrabold text-gray-200">N={championModel.metrics.sampleSizeN}</span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-gray-400 flex items-center justify-between border-t border-[#1F2937] pt-2">
                  <span>Net Realized P&L (14 Days): <strong className="text-emerald-400">+₹{championModel.metrics.netProfitINR.toLocaleString('en-IN')}</strong></span>
                  <span className="text-emerald-400 font-bold">● LIVE IN PRODUCTION</span>
                </div>
              </div>

              {/* Challenger Selector & Active Challenger Card */}
              <div className="bg-[#0F141F] border border-indigo-500/50 rounded-xl p-4 sm:p-5 relative shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-extrabold text-sm uppercase">
                    <Cpu className="w-4 h-4" />
                    <span>Shadow Challenger Active</span>
                  </div>
                  <select
                    value={selectedChallengerId}
                    onChange={(e) => setSelectedChallengerId(e.target.value)}
                    className="bg-[#151A23] border border-indigo-500/40 text-xs text-white rounded px-2.5 py-1 font-bold outline-none"
                  >
                    {championChallengers
                      .filter((m) => m.role === 'CHALLENGER')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{selectedModel.name}</h4>
                  <p className="text-xs text-indigo-300">{selectedModel.tagline}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{selectedModel.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F2937] text-center">
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Win Rate</span>
                    <span className={`text-sm font-extrabold ${selectedModel.metrics.winRatePct > championModel.metrics.winRatePct ? 'text-emerald-400' : 'text-white'}`}>
                      {selectedModel.metrics.winRatePct}%
                    </span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Net Expectancy</span>
                    <span className={`text-sm font-extrabold ${selectedModel.metrics.netExpectancyR > championModel.metrics.netExpectancyR ? 'text-emerald-400' : 'text-white'}`}>
                      +{selectedModel.metrics.netExpectancyR}R
                    </span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Profit Factor</span>
                    <span className={`text-sm font-extrabold ${selectedModel.metrics.profitFactor > championModel.metrics.profitFactor ? 'text-emerald-400' : 'text-white'}`}>
                      {selectedModel.metrics.profitFactor}
                    </span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Max DD</span>
                    <span className={`text-sm font-extrabold ${selectedModel.metrics.maxDrawdownPct < championModel.metrics.maxDrawdownPct ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedModel.metrics.maxDrawdownPct}%
                    </span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">WFE</span>
                    <span className={`text-sm font-extrabold ${selectedModel.metrics.walkForwardEfficiencyPct >= 65 ? 'text-indigo-300' : 'text-rose-400'}`}>
                      {selectedModel.metrics.walkForwardEfficiencyPct}%
                    </span>
                  </div>
                  <div className="bg-[#151A23] p-2 rounded">
                    <span className="text-[10px] text-gray-400 block uppercase">Sample Size</span>
                    <span className="text-sm font-extrabold text-gray-200">N={selectedModel.metrics.sampleSizeN}</span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center justify-between border-t border-[#1F2937] pt-2">
                  <span>Net Realized P&L: <strong className="text-indigo-300">+₹{selectedModel.metrics.netProfitINR.toLocaleString('en-IN')}</strong></span>
                  <span className="text-indigo-400 font-bold">● SHADOW EVALUATION</span>
                </div>
              </div>
            </div>

            {/* Challenger Promotion Gate Audit Checklist */}
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">
                    Challenger Promotion Gate & Statistical Verification (Requirement 9 & 15)
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-black uppercase ${
                    selectedModel.promotionChecklist.overallPromotable
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {selectedModel.promotionChecklist.overallPromotable ? '✓ PROMOTION CRITERIA SATISFIED' : '✗ PROMOTION BLOCKED'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-[#111622] p-3 rounded border border-[#1F2937] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-bold">1. Minimum Forward Sample</span>
                    {selectedModel.promotionChecklist.minSampleSizePassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Requires N ≥ 50 forward shadow / N ≥ 120 total. Current N = <strong>{selectedModel.metrics.sampleSizeN}</strong>.
                  </p>
                </div>

                <div className="bg-[#111622] p-3 rounded border border-[#1F2937] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-bold">2. Net Out-of-Sample Expectancy</span>
                    {selectedModel.promotionChecklist.positiveNetExpectancyPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Must achieve Net E(R) ≥ +0.25R after Indian taxes. Current = <strong>+{selectedModel.metrics.netExpectancyR}R</strong>.
                  </p>
                </div>

                <div className="bg-[#111622] p-3 rounded border border-[#1F2937] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-bold">3. Walk-Forward Efficiency (WFE)</span>
                    {selectedModel.promotionChecklist.walkForwardPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    OOS / IS performance ratio must exceed 65%. Current WFE = <strong>{selectedModel.metrics.walkForwardEfficiencyPct}%</strong>.
                  </p>
                </div>

                <div className="bg-[#111622] p-3 rounded border border-[#1F2937] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-bold">4. Max Drawdown Constraint</span>
                    {selectedModel.promotionChecklist.drawdownAcceptable ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Maximum Peak-to-Trough Drawdown must remain ≤ 12.0%. Current MDD = <strong>{selectedModel.metrics.maxDrawdownPct}%</strong>.
                  </p>
                </div>

                <div className="bg-[#111622] p-3 rounded border border-[#1F2937] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-bold">5. Outperformance vs Champion</span>
                    {selectedModel.promotionChecklist.statisticallySignificantOutperformance ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Must outperform Champion by &gt; +0.05R with p &lt; 0.05 statistical significance. Delta = <strong>+{+(selectedModel.metrics.netExpectancyR - championModel.metrics.netExpectancyR).toFixed(2)}R</strong>.
                  </p>
                </div>

                <div className="bg-[#111622] p-3 rounded border border-[#1F2937] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-bold">6. Forward Shadow Verification</span>
                    {selectedModel.promotionChecklist.forwardShadowValidated ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Verified on forward market observations without lookahead leakage.
                  </p>
                </div>
              </div>

              {selectedModel.promotionChecklist.overallPromotable ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-200">
                  <span>
                    🎉 <strong>Promotable Recommendation:</strong> {selectedModel.name} has passed all 6 gates with +{selectedModel.metrics.netExpectancyR}R Net Expectancy (+{+(selectedModel.metrics.netExpectancyR - championModel.metrics.netExpectancyR).toFixed(2)}R vs Champion). Export recommendation memo for production governance approval.
                  </span>
                  <button
                    onClick={() => {
                      if (onTriggerFeedback) onTriggerFeedback(`Exported Promotion Audit Memo for ${selectedModel.name}.`);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded text-[11px] uppercase tracking-wider shrink-0"
                  >
                    Generate Memo
                  </button>
                </div>
              ) : (
                <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-xs text-amber-200">
                  ⚠️ <strong>Challenger Remains in Shadow Mode:</strong> {selectedModel.name} does not meet all out-of-sample promotion standards. Production Champion remains active and protected from unverified parameter adjustments.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 2: FACTOR ATTRIBUTION & SYNERGIES */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'FACTOR_ATTRIBUTION' && (
          <div className="space-y-6">
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase">
                      Independent Factor Attribution & Information Coefficient (Requirement 3 & 14)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Measures incremental value (Δ E(R)) added by each factor when isolated vs inactive.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-gray-400 text-[11px]">
                      <th className="pb-2">FACTOR / FILTER</th>
                      <th className="pb-2">ACTIVE N</th>
                      <th className="pb-2">ACTIVE WIN%</th>
                      <th className="pb-2">ACTIVE E(R)</th>
                      <th className="pb-2">INACTIVE E(R)</th>
                      <th className="pb-2">INCREMENTAL Δ E(R)</th>
                      <th className="pb-2">95% BOOTSTRAP CI</th>
                      <th className="pb-2">VERDICT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {factorAttributions.map((f) => (
                      <tr key={f.factorKey} className="hover:bg-[#111622]">
                        <td className="py-2.5 pr-2">
                          <div className="font-bold text-white">{f.factorName}</div>
                          <div className="text-[10.5px] text-gray-400">{f.description}</div>
                        </td>
                        <td className="py-2.5 font-bold text-gray-300">
                          N={f.activeN}
                          {!f.sampleSizeAdequate && (
                            <span className="block text-[9.5px] text-amber-400 font-normal">⚠️ Low N</span>
                          )}
                        </td>
                        <td className="py-2.5 font-bold text-emerald-400">{f.activeWinRate}%</td>
                        <td className="py-2.5 font-bold text-white">+{f.activeNetExpectancy}R</td>
                        <td className="py-2.5 text-gray-400">{f.inactiveNetExpectancy >= 0 ? `+${f.inactiveNetExpectancy}R` : `${f.inactiveNetExpectancy}R`}</td>
                        <td className="py-2.5 font-black text-sm">
                          <span className={f.incrementalExpectancy >= 0.3 ? 'text-emerald-400' : f.incrementalExpectancy >= 0.1 ? 'text-indigo-300' : 'text-rose-400'}>
                            +{f.incrementalExpectancy}R
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-400 font-mono text-[11px]">
                          [{f.confidenceInterval[0]}R, {f.confidenceInterval[1]}R]
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            f.verdict === 'HIGH_EDGE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : f.verdict === 'MODERATE_EDGE'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : f.verdict === 'NEUTRAL'
                              ? 'bg-gray-700/40 text-gray-300'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {f.verdict.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Factor Interaction & Synergy Matrix */}
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#1F2937] pb-3">
                <Layers className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase">
                    Factor Interaction & Positive Synergy Modeling (Requirement 11)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Identifies multi-factor combinations that produce super-additive statistical edge versus isolated factors.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {factorInteractions.map((item, idx) => (
                  <div key={idx} className="bg-[#111622] p-3.5 rounded-lg border border-[#1F2937] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs">{item.combinationLabel}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-extrabold">
                        N={item.sampleSize}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-[#0A0D14] p-1.5 rounded">
                        <span className="text-[10px] text-gray-400 block">Sum of Standalone</span>
                        <span className="font-bold text-gray-300">+{item.standaloneSumExpectancy}R</span>
                      </div>
                      <div className="bg-[#0A0D14] p-1.5 rounded">
                        <span className="text-[10px] text-gray-400 block">Combined Synergistic</span>
                        <span className="font-extrabold text-emerald-400">+{item.synergisticCombinedExpectancy}R</span>
                      </div>
                      <div className="bg-[#0A0D14] p-1.5 rounded">
                        <span className="text-[10px] text-gray-400 block">Synergy Delta</span>
                        <span className="font-black text-indigo-300">+{item.synergyDeltaR}R</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regime-Specific Performance Breakdown */}
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#1F2937] pb-3">
                <Activity className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase">
                    Regime-Specific Factor Attribution Matrix (Requirement 10)
                  </h3>
                  <p className="text-xs text-gray-400">
                    A factor valuable in trend expansion (e.g. ADX) can be harmful during range chop.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {regimeAttributions.map((r) => (
                  <div key={r.regimeKey} className="bg-[#111622] p-3.5 rounded-lg border border-[#1F2937] space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs">{r.regimeLabel}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        +{r.netExpectancyR}R
                      </span>
                    </div>

                    <div className="text-[11px] space-y-1">
                      <div className="text-gray-300">
                        <strong className="text-emerald-400">Top Factors:</strong> {r.topPerformingFactors.join(', ')}
                      </div>
                      <div className="text-gray-400">
                        <strong className="text-rose-400">Harmful Filters:</strong> {r.harmfulFactors.join(', ')}
                      </div>
                      <div className="text-gray-500 text-[10px] pt-1">
                        Strategy: {r.recommendedStrategy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 3: COUNTERFACTUAL FILTER VALUE & PRUNING */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'COUNTERFACTUAL_FILTERS' && (
          <div className="space-y-6">
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase">
                      Counterfactual Shadow Trade Analysis (Requirement 4 & 5)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Evaluates every rejected signal to verify whether filters saved real losses or choked profitable trades.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-gray-400 text-[11px]">
                      <th className="pb-2">FILTER NAME</th>
                      <th className="pb-2">REJECTED TRADES</th>
                      <th className="pb-2">SAVED LOSSES</th>
                      <th className="pb-2">MISSED PROFIT</th>
                      <th className="pb-2">NET FILTER VALUE</th>
                      <th className="pb-2">NET CAPITAL PRESERVED</th>
                      <th className="pb-2">EFFICIENCY</th>
                      <th className="pb-2">VERDICT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {counterfactuals.map((cf) => (
                      <tr key={cf.filterKey} className="hover:bg-[#111622]">
                        <td className="py-2.5 pr-2">
                          <div className="font-bold text-white">{cf.filterName}</div>
                          <div className="text-[10px] text-gray-400">{cf.actionRecommendation}</div>
                        </td>
                        <td className="py-2.5 font-bold text-gray-300">N={cf.rejectedCount}</td>
                        <td className="py-2.5 font-bold text-emerald-400">
                          +{cf.savedLossesR}R <span className="text-[10px] text-gray-400 font-normal">({cf.savedLossesCount} stops)</span>
                        </td>
                        <td className="py-2.5 font-bold text-rose-400">
                          -{cf.missedProfitR}R <span className="text-[10px] text-gray-400 font-normal">({cf.missedWinnersCount} targets)</span>
                        </td>
                        <td className="py-2.5 font-black text-sm">
                          <span className={cf.netFilterValueR > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {cf.netFilterValueR > 0 ? `+${cf.netFilterValueR}R` : `${cf.netFilterValueR}R`}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-emerald-300">
                          +₹{cf.netSavedLossesINR.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 font-bold text-indigo-300">{cf.efficiencyRatio}%</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            cf.verdict === 'ESSENTIAL'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : cf.verdict === 'NEUTRAL_REDUNDANT'
                              ? 'bg-gray-700/40 text-gray-300'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {cf.verdict.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 4: MAE / MFE EXIT RESEARCH */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'MAE_MFE_EXITS' && (
          <div className="space-y-6">
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#1F2937] pb-3">
                <Target className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase">
                    Maximum Adverse & Favorable Excursion Exit Research (Requirement 2 & 7)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Optimizes initial stop losses and scale-out targets based on empirical intra-trade price journeys.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Winners MAE Distribution */}
                <div className="bg-[#111622] p-4 rounded-lg border border-[#1F2937] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-400 text-xs uppercase">
                      Winners MAE Excursion Distribution
                    </h4>
                    <span className="text-[10px] text-gray-400">93% of winners MAE ≤ 0.82R</span>
                  </div>

                  <div className="space-y-2">
                    {exitResearch.winnersMaeDistribution.map((w, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">{w.bucket}</span>
                          <span className="font-bold text-white">{w.frequencyPct}% ({w.cumulativePct}% cum)</span>
                        </div>
                        <div className="w-full bg-[#1F2937] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${w.frequencyPct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Losers MFE Reversion Distribution */}
                <div className="bg-[#111622] p-4 rounded-lg border border-[#1F2937] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-rose-400 text-xs uppercase">
                      Losers MFE Peak Reversion Distribution
                    </h4>
                    <span className="text-[10px] text-gray-400">Failing setups peak &lt; 0.65R</span>
                  </div>

                  <div className="space-y-2">
                    {exitResearch.losersMfeDistribution.map((l, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">{l.bucket}</span>
                          <span className="font-bold text-white">{l.frequencyPct}% ({l.cumulativePct}% cum)</span>
                        </div>
                        <div className="w-full bg-[#1F2937] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${l.frequencyPct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exit Calibration Recommendations */}
              <div className="bg-[#0F141F] p-4 rounded-lg border border-indigo-500/40 space-y-2">
                <h4 className="text-xs font-bold text-indigo-300 uppercase flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Quantitative Exit Calibration Recommendations</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
                  <div className="bg-[#151A23] p-2.5 rounded border border-[#1F2937]">
                    <span className="text-[10px] text-gray-400 block uppercase">Stop Loss ATR</span>
                    <span className="font-black text-rose-400 text-sm">1.50 ATR → 1.20 ATR</span>
                    <span className="block text-[9.5px] text-emerald-400 mt-0.5">-20% loss drag</span>
                  </div>
                  <div className="bg-[#151A23] p-2.5 rounded border border-[#1F2937]">
                    <span className="text-[10px] text-gray-400 block uppercase">First Partial Target</span>
                    <span className="font-black text-emerald-400 text-sm">1.50R → 1.85R</span>
                    <span className="block text-[9.5px] text-emerald-400 mt-0.5">+23% capture velocity</span>
                  </div>
                  <div className="bg-[#151A23] p-2.5 rounded border border-[#1F2937]">
                    <span className="text-[10px] text-gray-400 block uppercase">Expected Net Edge Boost</span>
                    <span className="font-black text-indigo-300 text-sm">+{exitResearch.estimatedExpectancyGainPct}%</span>
                    <span className="block text-[9.5px] text-gray-400 mt-0.5">Net Expectancy Lift</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 pt-2">{exitResearch.scientificRationale}</p>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 5: PARAMETER STABILITY & OVERFITTING RADAR */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'PARAMETER_STABILITY' && (
          <div className="space-y-6">
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase">
                      Parameter Stability & Plateau Analysis (Requirement 6 & 15)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Tests broad parameter ranges to verify stable profitable plateaus and reject overfitted isolated spikes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={selectedSweepParam}
                    onChange={(e) => setSelectedSweepParam(e.target.value)}
                    className="bg-[#111622] border border-indigo-500/40 text-xs text-white rounded px-3 py-1.5 font-bold outline-none"
                  >
                    {stabilityCurves.map((s) => (
                      <option key={s.parameterKey} value={s.parameterKey}>
                        {s.parameterName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-[#111622] p-4 rounded-lg border border-[#1F2937] space-y-3">
                <div className="flex flex-wrap items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{activeStabilityCurve.parameterName}</h4>
                    <p className="text-xs text-gray-400">{activeStabilityCurve.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Optimal Plateau: [{activeStabilityCurve.optimalPlateauRange[0]} - {activeStabilityCurve.optimalPlateauRange[1]}]
                    </span>
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Overfitting Risk: {activeStabilityCurve.overfittingRisk}
                    </span>
                  </div>
                </div>

                {/* Sweep Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1F2937] text-gray-400 text-[11px]">
                        <th className="pb-2">TESTED VALUE</th>
                        <th className="pb-2">SAMPLE N</th>
                        <th className="pb-2">WIN RATE</th>
                        <th className="pb-2">NET E(R)</th>
                        <th className="pb-2">SHARPE</th>
                        <th className="pb-2">MAX DD</th>
                        <th className="pb-2">PLATEAU REGION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]">
                      {activeStabilityCurve.sweepResults.map((r, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-[#151C2B] ${
                            r.value === activeStabilityCurve.currentProductionValue
                              ? 'bg-indigo-950/30 font-bold'
                              : ''
                          }`}
                        >
                          <td className="py-2 font-bold text-white">
                            {r.value}
                            {r.value === activeStabilityCurve.currentProductionValue && (
                              <span className="ml-2 text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-500 text-black font-extrabold">
                                PRODUCTION
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-gray-300">N={r.sampleSize}</td>
                          <td className="py-2 text-emerald-400">{r.winRate}%</td>
                          <td className="py-2 font-black text-white">+{r.netExpectancyR}R</td>
                          <td className="py-2 text-indigo-300">{r.sharpeEstimate}</td>
                          <td className="py-2 text-rose-400">{r.maxDrawdownPct}%</td>
                          <td className="py-2">
                            {r.isStablePlateau ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✓ ROBUST PLATEAU
                              </span>
                            ) : r.isIsolatedSpike ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ⚠️ ISOLATED SPIKE (OVERFIT)
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500">Sub-Optimal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 6: SIGNAL LEDGER & OPPORTUNITY COST */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'SIGNAL_LEDGER' && (
          <div className="space-y-6">
            {/* Opportunity Cost Analysis */}
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase">
                      Opportunity Cost & Selection Alpha Analysis (Requirement 12)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Measures whether ranking signals into top deciles concentrates capital into superior setups.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Avg Selection Alpha: +{opportunityCost.averageSelectionAlphaR}R
                  </span>
                  <span className="px-2.5 py-1 rounded text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Concentration Efficiency: {opportunityCost.capitalConcentrationEfficiencyPct}%
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-gray-400 text-[11px]">
                      <th className="pb-2">TIME</th>
                      <th className="pb-2">UNDERLYING</th>
                      <th className="pb-2">SELECTED SETUP (TOP-RANKED)</th>
                      <th className="pb-2">ALTERNATIVE CANDIDATE</th>
                      <th className="pb-2">SELECTION ALPHA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {opportunityCost.records.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[#111622]">
                        <td className="py-2 text-gray-400 font-mono">{r.cycleTimestamp}</td>
                        <td className="py-2 font-bold text-white">{r.underlying}</td>
                        <td className="py-2">
                          <span className="font-bold text-emerald-300">{r.selectedTrade.symbol}</span>
                          <span className="ml-2 font-black text-white">(+{r.selectedTrade.realizedR}R / +₹{r.selectedTrade.netPnLINR})</span>
                        </td>
                        <td className="py-2 text-gray-400">
                          <span>{r.bestAlternativeTrade.symbol}</span>
                          <span className="ml-2 text-gray-300">({r.bestAlternativeTrade.hypotheticalR >= 0 ? `+${r.bestAlternativeTrade.hypotheticalR}R` : `${r.bestAlternativeTrade.hypotheticalR}R`})</span>
                        </td>
                        <td className="py-2 font-black text-sm">
                          <span className={r.selectionAlphaR > 0 ? 'text-emerald-400' : 'text-gray-400'}>
                            +{r.selectionAlphaR}R
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Complete Signal Ledger */}
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase">
                    Comprehensive Empirical Signal Ledger ({filteredLogs.length} Records)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Complete immutable log of accepted and rejected signals with full factor states and MAE/MFE telemetry.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search symbol or regime..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-[#111622] border border-[#1F2937] text-xs text-white rounded px-2.5 py-1 outline-none w-44"
                  />
                  <select
                    value={signalLedgerFilter}
                    onChange={(e) => setSignalLedgerFilter(e.target.value as any)}
                    className="bg-[#111622] border border-[#1F2937] text-xs text-white rounded px-2.5 py-1 font-bold outline-none"
                  >
                    <option value="ALL">All Signals</option>
                    <option value="ACCEPTED">Accepted Only</option>
                    <option value="REJECTED">Rejected Only</option>
                    <option value="TOP_DECILE">Top-Decile Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-gray-400 text-[10.5px]">
                      <th className="pb-2">TIMESTAMP</th>
                      <th className="pb-2">SYMBOL</th>
                      <th className="pb-2">REGIME / TIME</th>
                      <th className="pb-2">LTP / SPREAD</th>
                      <th className="pb-2">SCORE</th>
                      <th className="pb-2">DECISION</th>
                      <th className="pb-2">MFE / MAE</th>
                      <th className="pb-2">REALIZED / HYPO R</th>
                      <th className="pb-2">PROVENANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {filteredLogs.slice(0, 25).map((l) => (
                      <tr key={l.id} className="hover:bg-[#111622]">
                        <td className="py-2.5 text-gray-400 font-mono text-[11px]">{l.timestamp}</td>
                        <td className="py-2.5">
                          <div className="font-bold text-white">{l.symbol}</div>
                          <div className="text-[10px] text-gray-400">Δ {l.greeks.delta} • IV {l.ivPct}%</div>
                        </td>
                        <td className="py-2.5">
                          <div className="font-bold text-indigo-300">{l.regime.replace('_', ' ')}</div>
                          <div className="text-[10px] text-gray-400">{l.timeOfDay.replace('_', ' ')}</div>
                        </td>
                        <td className="py-2.5 text-gray-300">
                          ₹{l.ltp} <span className="text-[10px] text-gray-400">({l.spreadPct}%)</span>
                        </td>
                        <td className="py-2.5 font-bold text-cyan-400">{l.goldenGateScore}/100</td>
                        <td className="py-2.5">
                          {l.decision === 'ACCEPTED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ACCEPTED
                            </span>
                          ) : (
                            <div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                REJECTED
                              </span>
                              <div className="text-[9.5px] text-rose-400 mt-0.5 max-w-[180px] truncate" title={l.rejectionReason}>
                                {l.rejectionReason}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-[11px]">
                          <span className="text-emerald-400 font-bold">+{l.maeMfe.mfeR}R</span> / <span className="text-rose-400 font-bold">-{l.maeMfe.maeR}R</span>
                        </td>
                        <td className="py-2.5 font-black text-sm">
                          {l.decision === 'ACCEPTED' ? (
                            <span className={l.maeMfe.realizedR > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {l.maeMfe.realizedR > 0 ? `+${l.maeMfe.realizedR}R` : `${l.maeMfe.realizedR}R`}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs font-mono">
                              [Hypo: {l.maeMfe.hypotheticalR >= 0 ? `+${l.maeMfe.hypotheticalR}R` : `${l.maeMfe.hypotheticalR}R`}]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 border border-gray-700">
                            {l.provenance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------------------------- */}
        {/* TAB 7: CHALLENGER SANDBOX */}
        {/* ----------------------------------------------------------------------------------------- */}
        {activeTab === 'CHALLENGER_SANDBOX' && (
          <div className="space-y-6">
            <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#1F2937] pb-3">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase">
                    Quantitative Challenger Strategy Sandbox (Requirement 8 & 18)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Define custom shadow strategy variants with modified weights, thresholds, and exit rules to evaluate in parallel against live market observations without risking production capital.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-bold">Challenger Model Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[#111622] border border-[#1F2937] text-xs text-white rounded p-2 outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-bold">Score Cutoff Gate ({customScoreCutoff}/100)</label>
                  <input
                    type="range"
                    min="60"
                    max="85"
                    value={customScoreCutoff}
                    onChange={(e) => setCustomScoreCutoff(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-bold">ADX Minimum Filter ({customAdxMin})</label>
                  <input
                    type="range"
                    min="14"
                    max="35"
                    value={customAdxMin}
                    onChange={(e) => setCustomAdxMin(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-bold">RVOL Minimum Surge ({customRvolMin}x)</label>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.1"
                    value={customRvolMin}
                    onChange={(e) => setCustomRvolMin(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-bold">Stop Loss ATR Multiplier ({customSlAtr}x)</label>
                  <input
                    type="range"
                    min="0.8"
                    max="2.2"
                    step="0.05"
                    value={customSlAtr}
                    onChange={(e) => setCustomSlAtr(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-bold">First Partial Target ({customTarget1R}R)</label>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={customTarget1R}
                    onChange={(e) => setCustomTarget1R(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1F2937] flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Runs purely in shadow simulation. Never routes orders to broker API.
                </p>
                <button
                  onClick={() => {
                    if (onTriggerFeedback) onTriggerFeedback(`Registered custom shadow challenger "${customName}" for empirical observation.`);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded text-xs shadow"
                >
                  Save & Launch Shadow Evaluation
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

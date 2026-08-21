import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Layers,
  Activity,
  DollarSign,
  Clock,
  Sliders,
  ChevronRight,
  Lightbulb
} from 'lucide-react';

interface HelpKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpItem {
  id: string;
  category: 'GREEKS' | 'METRICS' | 'GATES' | 'MODES' | 'ACTIONS';
  title: string;
  shortDesc: string;
  formula?: string;
  fullExplanation: string;
  actionAdvice: string;
  keepOrRemoveRecommendation: string;
}

const HELP_ITEMS: HelpItem[] = [
  {
    id: 'win_prob',
    category: 'METRICS',
    title: 'Win Probability %',
    shortDesc: 'Mathematical probability that this trade will reach its target before hitting stop loss.',
    formula: 'Win% = Base Rate + Trend Weight (15m) + RVOL Surge Bonus + Delta Factor - Theta Penalty',
    fullExplanation: 'Quant engine calculates empirical win probability by weighting 15-minute primary trend confluence, 5-minute pullback retests, Relative Volume (RVOL), and Black-Scholes Delta sensitivity.',
    actionAdvice: 'Trades with >75% win probability are prime entries. Avoid trades below 65% unless the Risk-Reward ratio is greater than 1:3.',
    keepOrRemoveRecommendation: 'KEEP: Essential core filter for positive statistical expectancy.'
  },
  {
    id: 'net_ev',
    category: 'METRICS',
    title: 'Net Expected Value (EV in ₹)',
    shortDesc: 'Statistical net profit expected per trade after deducting estimated slippage & exchange STT/brokerage.',
    formula: 'Net EV = (Win% × Potential Profit) - (Loss% × Potential Loss) - Est. Brokerage & Slippage',
    fullExplanation: 'Expected Value ensures you only take trades where the math is tilted in your favor over a large series of executions. Even high win-rate trades with poor R:R have negative EV and get filtered out.',
    actionAdvice: 'Only execute setups with positive Net EV (+₹200 or higher). If EV is negative or zero, let the trade pass.',
    keepOrRemoveRecommendation: 'KEEP: Primary quantitative gate that guarantees long-term profitability.'
  },
  {
    id: 'delta',
    category: 'GREEKS',
    title: 'Delta (Δ) & ATM/ITM Selection',
    shortDesc: 'Rate of change of option price per ₹1 move in the underlying index/stock spot.',
    formula: 'Delta = N(d1) for Calls, N(d1) - 1 for Puts',
    fullExplanation: 'High Delta (0.45 - 0.70) contracts move almost tick-for-tick with the index, capturing fast momentum with minimal lag. Deep OTM options have low delta (<0.20) and lose value even if the index moves correctly.',
    actionAdvice: 'For intraday buying, select ATM or slightly ITM contracts (Delta 0.45 - 0.65). Never buy deep OTM contracts (Delta <0.30).',
    keepOrRemoveRecommendation: 'KEEP: Vital parameter to prevent buying dying out-of-the-money lottery tickets.'
  },
  {
    id: 'theta_decay',
    category: 'GREEKS',
    title: 'Theta Decay (%/Day & Expiry Penalty)',
    shortDesc: 'Daily time decay erosion suffered by long option contracts as expiry approaches.',
    formula: 'Theta Decay/Day = (∂V/∂t) / Option Price × 100',
    fullExplanation: 'On expiry day (0-DTE) or 1-DTE, option premiums lose 30% to 70% of their value in sideways markets due to accelerated Theta decay. The system applies strict penalties to trades holding during low-momentum periods.',
    actionAdvice: 'On Expiry Day, only hold options during explosive volume breakouts. Exit within 10-15 minutes if price consolidates.',
    keepOrRemoveRecommendation: 'KEEP: Prevents heavy theta decay bleed when trades stall.'
  },
  {
    id: 'rvol',
    category: 'METRICS',
    title: 'Relative Volume (RVOL)',
    shortDesc: 'Current candle volume compared to the 20-period average volume at this time of day.',
    formula: 'RVOL = Current Volume / 20-Period Moving Average Volume',
    fullExplanation: 'Institutional breakout trades require volume participation. An RVOL > 1.5x signals aggressive buyer/seller accumulation. Breakouts on RVOL < 1.0x are frequently bull/bear traps.',
    actionAdvice: 'Demand RVOL ≥ 1.4x for breakout confirmations. Low RVOL (< 1.0x) triggers automatic trade rejection.',
    keepOrRemoveRecommendation: 'KEEP: Top volume filter preventing trap entries.'
  },
  {
    id: 'live_vs_shadow',
    category: 'MODES',
    title: 'Live Zerodha vs Shadow Sandbox Mode',
    shortDesc: 'Toggle between real brokerage execution and zero-risk paper trading simulation.',
    fullExplanation: 'Live Mode places real orders via your authenticated Zerodha Kite API session with real margin, live slippage, and real P&L. Shadow Sandbox Mode uses identical live market prices and Black-Scholes quotes but executes in memory without risking actual capital.',
    actionAdvice: 'Use Shadow Mode to test new strategies or inspect rejected trades. Switch to Live Mode only when you are ready to route capital.',
    keepOrRemoveRecommendation: 'KEEP: Crucial safety architecture protecting trader funds.'
  },
  {
    id: 'tsl_guard',
    category: 'ACTIONS',
    title: 'Dynamic Trailing Stop Loss (TSL)',
    shortDesc: 'Smart stop loss that locks in profits as the trade moves in your direction and tightens on stagnancy.',
    formula: 'Trailing SL = Max(Initial SL, Highest High - Volatility Buffer)',
    fullExplanation: 'Once a position gains +5% to +10%, the TSL automatically trails upward to entry price (breakeven) and steps up with every new high tick, preventing winning trades from turning into losses.',
    actionAdvice: 'Keep Trailing SL enabled. It removes emotional exit hesitation and captures the meat of trends.',
    keepOrRemoveRecommendation: 'KEEP: Best risk-management tool for locking in windfall gains.'
  },
  {
    id: 'rejected_trades_log',
    category: 'GATES',
    title: 'Rejected Trades & Sandbox Testing',
    shortDesc: 'Log of signals that failed system risk/math criteria, tracked in real-time to audit logic.',
    fullExplanation: 'When a trade fails risk gates (e.g., negative EV, low RVOL, bad R:R), the system records it to `rejected_trades.json` and tracks what would have happened. You can click "Test in Shadow" to see if the engine saved you from a loss.',
    actionAdvice: 'Review rejected trades to verify why the engine blocked them. If 80%+ of rejected trades would have lost money, your filters are working perfectly!',
    keepOrRemoveRecommendation: 'KEEP: Essential feedback loop for data-driven algorithmic refinement.'
  }
];

export const HelpKnowledgeModal: React.FC<HelpKnowledgeModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<HelpItem>(HELP_ITEMS[0]);

  if (!isOpen) return null;

  const filteredItems = HELP_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fullExplanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center space-x-2">
                <span>GoldenGate Knowledge & Action Guide</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Interactive Help
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Understand every indicator, Greek formula, risk gate, and what to keep vs remove.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/30 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search concepts, formulas, Greeks, or action rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto text-xs">
            {['ALL', 'METRICS', 'GREEKS', 'GATES', 'MODES', 'ACTIONS'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-0">
          {/* Left Column: Topics List */}
          <div className="md:col-span-5 overflow-y-auto p-2 space-y-1 max-h-[300px] md:max-h-[500px]">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No matching topics found. Try another query.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border border-amber-500/40 text-slate-100 shadow-sm'
                        : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.shortDesc}</p>
                    </div>
                    <ChevronRight size={14} className={`shrink-0 mt-1 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Full Details & Action Recommendation */}
          <div className="md:col-span-7 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[500px]">
            {selectedItem ? (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <h3 className="text-base font-black text-amber-400 flex items-center space-x-2">
                    <span>{selectedItem.title}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {selectedItem.category}
                  </span>
                </div>

                {/* Explanation */}
                <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
                  <p>{selectedItem.fullExplanation}</p>

                  {selectedItem.formula && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">
                        Quantitative Formula
                      </span>
                      <code className="text-xs font-mono text-emerald-400 block whitespace-pre-wrap">
                        {selectedItem.formula}
                      </code>
                    </div>
                  )}

                  {/* Trading Action Advice */}
                  <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
                      <Lightbulb size={14} />
                      <span>Actionable Trading Guidance</span>
                    </div>
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {selectedItem.actionAdvice}
                    </p>
                  </div>

                  {/* Keep or Remove Recommendation */}
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 size={14} />
                      <span>Architectural Recommendation (Keep vs Remove)</span>
                    </div>
                    <p className="text-xs text-emerald-200 leading-relaxed font-semibold">
                      {selectedItem.keepOrRemoveRecommendation}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select a topic from the left to view complete explanations and actionable advice.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hover or click any (i) icon in the trading terminal for instantaneous tooltips.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs cursor-pointer transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

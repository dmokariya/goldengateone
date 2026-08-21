export type DataFeedStatus = 'LIVE' | 'STALE' | 'UNAVAILABLE' | 'DISCONNECTED';
export type SignalProvenanceSource = 'ZERODHA_KITE_LIVE' | 'INSUFFICIENT_DATA';

export type ExecutionMode = 'HFT_SIM' | 'ZERODHA_KITE' | 'BACKTEST';

export interface OrderDepthItem {
  price: number;
  quantity: number;
  ordersCount: number;
  depthPct: number; // percentage width for depth bar background
}

export interface OrderBookDepth {
  symbol: string;
  lastTradedPrice: number;
  change24h: number;
  changePct: number;
  high: number;
  low: number;
  asks: OrderDepthItem[]; // SELL side (sorted high to low)
  bids: OrderDepthItem[]; // BUY side (sorted high to low)
  spreadBps: number;
  bidDepthTotal: number;
  askDepthTotal: number;
}

export type LogType = 'FILL_BUY' | 'FILL_SELL' | 'SIGNAL' | 'API_ACK' | 'REJECT' | 'HEARTBEAT' | 'SYSTEM' | 'THROTTLE';

export interface ExecutionLogItem {
  id: string;
  timestamp: string; // e.g., "14:22:01.0024"
  rawTimeMs: number;
  type: LogType;
  symbol?: string;
  price?: number;
  quantity?: number;
  message: string;
  latencyMs?: number;
}

export interface AlphaModelSignal {
  id: string;
  name: string;
  strengthPct: number; // 0-100
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  latencyMicrosec: number;
  barHeights: number[]; // 5 bars for frequency equalizer display
  active: boolean;
}

export interface TradeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'SL_MARKET';
  price: number;
  triggerPrice?: number;
  quantity: number;
  status: 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED';
  timestamp: string;
  latencyMs: number;
  pnl?: number;
  isSliced?: boolean;
  sliceCount?: number;
  childOrderIds?: string[];
  slippageProtectedPrice?: number;
  freezeLimitApplied?: number;
}

export interface PerformanceStats {
  netPnL: number;
  todayPnLPct: number;
  totalOrders: number;
  filledOrders: number;
  winRate: number; // percentage
  avgLatencyMs: number; // e.g. 0.42ms in HFT sim vs 145ms in Zerodha
  avgSlippagePct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
}

export interface KiteSessionHealth {
  isValid: boolean;
  checkedAt: string;
  latencyMs: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  broker?: string;
  expiresAtFormatted: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NOT_CONFIGURED';
  message?: string;
}

export interface SlippageGuardConfig {
  enabled: boolean;
  bufferPct: number; // e.g. 0.5%
  autoLimitProtection: boolean;
}

export interface TickDataPoint {
  time: string;
  price: number;
  pnl: number;
  volume: number;
  signalScore: number;
}

export interface ZerodhaApiCredentials {
  apiKey: string;
  apiSecret: string;
  requestToken: string;
  accessToken: string;
  isConnected: boolean;
  userLoginId: string;
  brokerageAccount: string;
  simulatedPingMs: number;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  timeframeMs: number;
  maxPositionSize: number;
  stopLossPct: number;
  takeProfitPct: number;
  status: 'ACTIVE' | 'PAUSED' | 'TESTING';
  winCount: number;
  lossCount: number;
  totalPnL: number;
}

export type AssetCategory = 'NIFTY_FNO' | 'BANKNIFTY_FNO' | 'FINNIFTY_FNO' | 'EQUITY_INTRADAY';

export interface TradeableContract {
  symbol: string;
  tradingsymbol: string;
  exchange: 'NFO' | 'NSE' | 'BSE' | 'BFO';
  category: AssetCategory;
  lotSize: number;
  lastPrice: number;
  strikePrice?: number;
  optionType?: 'CE' | 'PE';
  expiry?: string;
  moneyness?: 'ITM' | 'ATM' | 'OTM' | 'FAR_OTM';
  isAtmNearStrike?: boolean; // ATM ± 2 strikes (High Liquidity)
}

export interface CandleData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9?: number;
  ema21?: number;
  rsi14?: number;
  vwap?: number;
  supertrend?: number;
  supertrendDirection?: 'BULL' | 'BEAR';
  signal?: 'BUY' | 'SELL' | null;
}

export type MarketSessionState = 'PREOPEN' | 'OPEN' | 'CLOSING' | 'CLOSED';

export interface StrategyAttribution {
  regimeTrend: number; // max 20 pts
  momentum: number; // max 15 pts
  volume: number; // max 15 pts
  optionQuality: number; // max 15 pts
  liquidity: number; // max 15 pts
  structure: number; // max 10 pts
  riskReward: number; // max 10 pts
  totalScore: number; // max 100 pts (GoldenGate Confluence Score)
}

export type RejectionCode =
  | 'STALE_DATA'
  | 'EXCESSIVE_SPREAD'
  | 'INSUFFICIENT_MARKET_DEPTH'
  | 'LOW_OI_VOLUME_LIQUIDITY'
  | 'PRICE_SLIPPED'
  | 'DAILY_LOSS_LIMIT_BREACHED'
  | 'CONSECUTIVE_LOSSES_COOLDOWN'
  | 'MAX_PORTFOLIO_CORRELATION'
  | 'UNRESOLVED_INSTRUMENT'
  | 'MARKET_SESSION_CLOSED'
  | 'OPENING_VOLATILITY_FILTER'
  | 'EOD_ENTRY_CUTOFF'
  | 'HOLIDAY_CLOSED'
  | 'IV_INFLATION_SANITY'
  | 'MAX_PREMIUM_AT_RISK_EXCEEDED'
  | 'REENTRY_COOLDOWN_ACTIVE'
  | 'DUPLICATE_SIGNAL_IDEMPOTENT'
  | 'SERVER_KILL_SWITCH_ACTIVE'
  | 'CHOPPY_REGIME_OPTION_BUY_BLOCKED';

export type TimeOfDayBucket =
  | 'PRE_OPEN'
  | 'OPENING_DISCOVERY' // 09:15 - 09:25 IST
  | 'MORNING_TREND' // 09:25 - 10:45 IST
  | 'MIDDAY_CHOP' // 10:45 - 13:30 IST
  | 'AFTERNOON_MOMENTUM' // 13:30 - 14:45 IST
  | 'CLOSING_EOD' // 14:45 - 15:30 IST
  | 'MARKET_CLOSED';

export type DteRegime =
  | 'GT_5_DTE' // > 5 Days to Expiry (Low theta decay)
  | '2_TO_5_DTE' // 2-5 Days to Expiry (Standard swing/intraday)
  | '1_DTE' // 1 Day to Expiry (Elevated theta decay)
  | 'EXPIRY_DAY' // Expiry Day (High gamma, violent decay)
  | 'EXPIRY_FINAL_90MIN'; // Final 90 mins of Expiry (Extreme zero-hero risk)

export interface IndianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  exchange: 'NSE' | 'BSE' | 'ALL';
  isTradingHoliday: boolean;
}

export interface MarketCalendarStatus {
  isOpen: boolean;
  state: MarketSessionState;
  timeOfDayBucket: TimeOfDayBucket;
  isHoliday: boolean;
  holidayName?: string;
  isOpeningFilterActive: boolean; // 09:15 - 09:25
  isEodCutoffActive: boolean; // 14:45+ (no new entries)
  istTimeFormatted: string;
  currentDateIST: string;
  reason: string;
}

export interface PortfolioGreeks {
  netDelta: number; // e.g. +1.45 (Net directional bias)
  netGamma: number; // e.g. +0.012
  netThetaINR: number; // e.g. -2450.00 ₹/day
  netVegaINR: number; // e.g. +380.00 ₹/1% IV change
  directionalBias: 'BULLISH' | 'BEARISH' | 'DELTA_NEUTRAL';
  openPositionsCount: number;
  totalExposureINR: number;
  totalPremiumAtRiskINR: number;
  updatedAt: string;
}

export interface StrikeSelectionResult {
  underlyingSymbol: string;
  spotPrice: number;
  atmStrike: number;
  stepSize: number;
  selectedStrike: number;
  optionType: 'CE' | 'PE';
  moneyness: 'ITM' | 'ATM' | 'OTM';
  dte: number;
  dteRegime: DteRegime;
  expiryDateStr: string;
  suggestedTradingsymbol: string;
}

export interface SignalPerformanceRecord {
  id: string; // Unique signal ID / idempotency key
  timestamp: string; // ISO / IST string
  timestampMs: number;
  underlying: string; // e.g. "NIFTY"
  symbol: string; // e.g. "NIFTY26AUG24650CE"
  strike: number;
  optionType: 'CE' | 'PE' | 'EQ';
  direction: 'BUY' | 'SELL';
  dte: number;
  dteRegime: DteRegime;
  timeOfDayBucket: TimeOfDayBucket;
  marketRegime: string;
  spotPriceAtSignal: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskRewardRatio: number;
  winProbabilityPct: number;
  goldenGateScore: number;
  attribution: StrategyAttribution;
  spreadPct: number;
  ivPct: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  volume: number;
  openInterest: number;
  depthAbsorptionRatio?: number;
  marketBreadth?: string;
  sectorConfirmation?: string;
  preTradeStatus: 'APPROVED' | 'REJECTED';
  rejectionCode?: RejectionCode;
  rejectionReason?: string;
  isPaperTrade: boolean;
  orderId?: string;
  status: 'PENDING' | 'ACTIVE' | 'TARGET_HIT' | 'SL_HIT' | 'TIME_EXIT' | 'CANCELLED';
  currentPrice?: number;
  mfe: number; // Maximum Favourable Excursion (₹ price distance)
  mae: number; // Maximum Adverse Excursion (₹ price distance)
  mfePct: number; // Peak profit %
  maePct: number; // Peak drawdown %
  finalPnlINR?: number;
  finalReturnPct?: number;
  exitPrice?: number;
  exitTimestamp?: string;
  timeToExitMins?: number;
  timeToTargetOrSlMins?: number;
  notes?: string;
}

export interface PreTradeValidationResult {
  approved: boolean;
  rejectionCode?: RejectionCode;
  reason?: string;
  validatedPrice?: number;
  riskAdjustedQuantity?: number;
  riskBudgetINR?: number;
  attribution?: StrategyAttribution;
  goldenGateScore?: number;
  timestampMs: number;
}

export interface OptionGreeks {
  delta: number; // e.g. 0.62 (or -0.55)
  deltaStatus: 'EXCELLENT' | 'GOOD' | 'WEAK';
  deltaWinBoostPct: number; // e.g. +23.5% boost to win probability
  gamma: number; // e.g. 0.0038
  gammaStatus: 'HIGH_ACCELERATION' | 'STABLE' | 'LOW';
  theta: number; // e.g. -14.2 ₹/day decay
  thetaStatus: 'SAFE_LOW_DECAY' | 'MODERATE' | 'HIGH_DECAY_RISK' | 'SEVERE_HIGH_DECAY';
  vega: number; // e.g. 8.5
  vegaStatus: 'FAVORABLE_VOLATILITY' | 'NEUTRAL';
  ivPct: number; // e.g. 15.4%
  overallRating: 'EXCELLENT' | 'FAVORABLE' | 'NEUTRAL' | 'RISKY' | 'AVOID';
  thetaDecayPctPerDay?: number; // e.g. -20.8% of premium lost per day
  moneyness?: 'DEEP_ITM' | 'ITM' | 'ATM' | 'OTM' | 'FAR_OTM' | 'EQUITY';
}

export interface LikelihoodCalculation {
  winProbabilityPct: number; // Combined Calibrated Win Probability
  monteCarloWinRatePct: number; // Monte Carlo Drift-Diffusion Model
  bayesianWinRatePct?: number; // Bayesian Technical Confluence Model
  quantMemoryWinRatePct?: number; // Quant Memory Trade History Learning Model
  combinedCalibratedWinRatePct?: number; // Ensemble Calibrated Win Rate
  expectedValueINR: number; // expected payoff per trade/lot
  deltaGreeksScore: string; // e.g. "+0.64 Bullish Delta"
  sharpeRatioEstimate: number; // e.g. 2.45
  rationale: string; // quantitative formula rationale
  technicalIndicatorsBreakdown?: {
    rsi: number;
    emaStatus: string;
    vwapStatus: string;
    supportLevel: number;
    resistanceLevel: number;
    l2BidAskRatio: number;
  };
  timeHorizonBreakdown?: {
    mins: number;
    cumulativeWinProbPct: number;
    expectedPayoffINR: number;
    note: string;
  }[];
  timeStopRule?: string; // e.g. "Exit if flat after 12 Mins"
  quantitativeBasis?: string[];
}

export interface LiveTradeSignal {
  id: string;
  symbol: string;
  category: AssetCategory;
  assetName: string; // e.g. "NIFTY 24650 CE" or "RELIANCE"
  direction: 'BUY' | 'SELL';
  timeframe: '1m' | '5m';
  entryPrice: number;
  currentLtp?: number;
  targetPrice: number;
  stopLossPrice: number;
  winProbabilityPct: number; // e.g. 88%
  riskRewardRatio: number; // e.g. 2.4
  confidenceLevel: 'HIGH' | 'VERY_HIGH' | 'MEDIUM' | 'LOW';
  indicatorConfluence: string[]; // e.g. ["EMA 9/21 Crossover", "RSI > 60", "Price Above VWAP"]
  timestamp: string; // Display time e.g. "10:30:15 AM"
  generatedAtMs?: number; // Timestamp ms when signal generated
  expiresAtMs?: number; // Timestamp ms when trade must be discarded
  validDurationMins?: number; // Default 15 mins validity
  status?: 'ACTIVE' | 'DISCARDED' | 'EXECUTED';
  discardReason?: string; // Reason why trade was discarded
  expiryOrStrike?: string;
  expectedTimeHorizon: string; // e.g. "12 - 25 Mins (Intraday Scalp)"
  laymanReason?: string; // One-liner simple explanation
  source: SignalProvenanceSource;
  dataTimestampMs: number;
  spotPriceUsed: number;
  underlyingSymbol: string;
  timeToExpiryYears?: number;
  actualIV?: number;
  riskFreeRate?: number;
  marketRegime?: 'BULLISH_TREND' | 'BEARISH_TREND' | 'CHOPPY_SIDEWAYS' | 'HIGH_VOLATILITY';
  greeks?: OptionGreeks;
  isMustTakeTrade?: boolean; // 🔥 95%+ Win Rate CAS Squeeze Flag
  mustTakeReason?: string; // Explanation of CAS system loophole
  isBadTradeWarning?: boolean; // ⚠️ True if low probability / OTM theta trap
  badTradeReason?: string; // Detailed warning explanation
  isCounterTrend?: boolean; // True if opposing current market regime
  counterTrendWarning?: string; // Warning banner text
  optionStyle?: 'CALL' | 'PUT' | 'EQUITY';
  goldenGateScore?: number; // 0 - 100 Confluence Score
  strategyAttribution?: StrategyAttribution; // Transparent attribution breakdown
  netExpectedValueINR?: number; // Realized net EV after all Indian taxes & brokerage
  transactionCostINR?: number; // Estimated STT, GST, Exchange fees, SEBI, stamp duty & brokerage
  likelihoodCalculation: LikelihoodCalculation;
  zerodhaPayload: {
    tradingsymbol: string;
    exchange: 'NFO' | 'NSE' | 'BSE' | 'BFO';
    transaction_type: 'BUY' | 'SELL';
    quantity: number;
    order_type: 'LIMIT' | 'MARKET';
    product: 'MIS' | 'NRML';
    price: number;
  };
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  pnlINR: number;
  pnlPct: number;
  result: 'WIN' | 'LOSS';
  reason: 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'EOD_SQUAREOFF';
}

export interface BacktestReport {
  id: string;
  strategyName: string;
  symbol: string;
  timeframe: '1m' | '5m';
  periodDays: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  netProfitINR: number;
  netReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
}

export interface ActivePosition {
  id: string;
  orderId: string;
  symbol: string;
  tradingsymbol: string;
  exchange: 'NFO' | 'NSE' | 'BSE' | 'BFO';
  direction: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  highestPriceReached?: number;
  lowestPriceReached?: number;
  trailingStopLossPrice?: number;
  trailingDistancePct?: number; // default 5%
  targetPrice?: number;
  stopLossPrice?: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  timestamp: string;
  openedAtMs?: number;
  status: 'OPEN' | 'CLOSED';
  expectedTimeHorizon?: string;
  winProbabilityPct?: number;
  timeStopRule?: string;
  holdingTimeMins?: number;
  maxAllowedMins?: number;
  autoTimeStopEnabled?: boolean;
  autoTrailingStopEnabled?: boolean;
  exitReason?: 'MANUAL_EXIT' | 'TIME_STOP_AUTO_EXIT' | 'TRAILING_STOP_AUTO_EXIT' | 'TARGET_HIT_AUTO_EXIT' | 'STOP_LOSS_AUTO_EXIT';
}


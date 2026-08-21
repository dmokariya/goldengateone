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

export type AssetCategory = 'NIFTY_FNO' | 'BANKNIFTY_FNO' | 'FINNIFTY_FNO' | 'SENSEX_FNO' | 'EQUITY_INTRADAY';

export interface RealizedEvidenceLog {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  goldenGateScore: number;
  evidencePillarsCount: number;
  entryLtp: number;
  actualFillPrice: number;
  exitPrice: number;
  slippageINR: number;
  slippagePct: number;
  transactionCostsINR: number;
  realizedPnlINR: number;
  realizedRMultiple: number;
  result: 'WIN' | 'LOSS' | 'BREAKEVEN';
  timeOfDay: TimeOfDayBucket;
  marketRegime: string;
  timestamp: string;
  source: 'ZERODHA_KITE_LIVE' | 'PAPER_SHADOW';
}

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

// -------------------------------------------------------------------------------------------------
// GOLDENGATE PROFITABILITY & EDGE ENGINE TYPES
// -------------------------------------------------------------------------------------------------

export type MtfAlignmentStatus =
  | 'PERFECT_BULLISH' // 5m, 15m, 1h all bullish
  | 'PERFECT_BEARISH' // 5m, 15m, 1h all bearish
  | 'PARTIAL_BULLISH' // 2 of 3 bullish
  | 'PARTIAL_BEARISH' // 2 of 3 bearish
  | 'CONFLICTING_DIVERGENCE'; // Timeframes in direct conflict

export interface TimeframeTrendBar {
  timeframe: '5m' | '15m' | '1h';
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  ema9: number;
  ema21: number;
  ema50: number;
  supertrend: number;
  supertrendDirection: 'BULL' | 'BEAR';
  structure: 'HIGHER_HIGHS' | 'LOWER_LOWS' | 'CONSOLIDATION';
  score: number; // 0-100
}

export interface MultiTimeframeTrend {
  status: MtfAlignmentStatus;
  alignmentScore: number; // 0-100
  bars: {
    m5: TimeframeTrendBar;
    m15: TimeframeTrendBar;
    h1: TimeframeTrendBar;
  };
  summary: string;
}

export interface VwapProfile {
  vwapValue: number;
  priceLocation: 'ABOVE_VWAP' | 'BELOW_VWAP' | 'AT_VWAP_TEST';
  slope: 'RISING' | 'FALLING' | 'FLAT';
  slopeBpsPerBar: number;
  distancePct: number;
  upperBand1: number;
  lowerBand1: number;
  upperBand2: number;
  lowerBand2: number;
  vwapBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
}

export interface AdxProfile {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK_CHOPPY';
  directionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isOptionBuyPermitted: boolean; // false if ADX < 20
  summary: string;
}

export interface RvolProfile {
  rvol: number; // e.g. 1.85 (185% of 20-period SMA volume)
  currentVolume: number;
  avgVolume20: number;
  volumeRegime: 'INSTITUTIONAL_SURGE' | 'ABOVE_AVERAGE' | 'NORMAL' | 'LOW_PARTICIPATION_TRAP';
  isInstitutionalParticipation: boolean;
  summary: string;
}

export interface MarketBreadthProfile {
  niftyAdvancers: number;
  niftyDecliners: number;
  advanceDeclineRatio: number;
  bankNiftyBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  itSectorBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  relianceBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  overallBreadthBias: 'STRONG_BULLISH' | 'MODERATE_BULLISH' | 'NEUTRAL' | 'MODERATE_BEARISH' | 'STRONG_BEARISH';
  breadthScore: number; // -100 to +100
  summary: string;
}

export interface SupportResistanceStructure {
  nearestSupport: number;
  nearestResistance: number;
  orb15mHigh: number;
  orb15mLow: number;
  pdh: number;
  pdl: number;
  pdc: number;
  pivotPoint: number;
  structureState: 'BREAKOUT_EXPANSION' | 'SUCCESSFUL_RETEST' | 'RANGE_BOUND' | 'FAKEOUT_REJECTION' | 'PULLBACK_SUPPORT';
  distanceToBreakoutPct: number;
  structuralQualityScore: number; // 0-100
  summary: string;
}

export interface AtrVolatilityProfile {
  atr14: number;
  atrPct: number;
  volatilityRegime: 'EXPANDING' | 'NORMAL' | 'SQUEEZE_COMPRESSION';
  isSqueezeAlert: boolean; // BB inside Keltner
  suggestedStopDistance: number; // 1.5x ATR
  suggestedTargetDistance: number; // 2.5x ATR
  summary: string;
}

export interface MomentumAccelerationProfile {
  macdLine: number;
  signalLine: number;
  macdHist: number;
  macdAcceleration: number; // 2nd derivative / delta of hist
  rsi14: number;
  rsiSlope: number;
  roc10: number;
  momentumRegime: 'ACCELERATING_BULLISH' | 'EXHAUSTING_BULLISH' | 'ACCELERATING_BEARISH' | 'EXHAUSTING_BEARISH' | 'MOMENTUM_NEUTRAL';
  summary: string;
}

export interface OptionChainConfirmation {
  pcr: number; // Put-Call Ratio
  pcrRegime: 'STRONG_SUPPORT' | 'MILD_BULLISH' | 'NEUTRAL' | 'MILD_BEARISH' | 'STRONG_RESISTANCE';
  maxPainStrike: number;
  highCallOiStrike: number;
  highPutOiStrike: number;
  callOiChange: 'LONG_BUILDUP' | 'SHORT_COVERING' | 'CALL_WRITING' | 'LONG_UNWINDING';
  putOiChange: 'PUT_WRITING' | 'PUT_BUYING' | 'SHORT_COVERING' | 'PUT_UNWINDING';
  ivPercentile: number;
  ivSanityPassed: boolean;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
}

export interface EvidencePillarItem {
  name: string;
  passed: boolean;
  score: number; // weight contribution
  maxScore: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  note: string;
}

export interface EvidenceStackSummary {
  pillars: {
    multiTimeframe: EvidencePillarItem;
    vwapProfile: EvidencePillarItem;
    adxStrength: EvidencePillarItem;
    rvolVolume: EvidencePillarItem;
    srStructure: EvidencePillarItem;
    marketBreadth: EvidencePillarItem;
    optionChain: EvidencePillarItem;
    timeOfDay: EvidencePillarItem;
  };
  totalConfluenceScore: number; // 0-100
  passedPillarsCount: number; // e.g. 7/8
  totalPillarsCount: number; // 8
  conflictDetected: boolean;
  conflictReasons: string[];
  finalDecision: 'EXECUTE_BUY' | 'EXECUTE_SELL' | 'NO_TRADE_EVIDENCE_CONFLICT' | 'NO_TRADE_TIME_FILTER' | 'NO_TRADE_CHOPPY_REGIME';
  decisionRationale: string;
}

// -------------------------------------------------------------------------------------------------
// HISTORICAL SETUP MATCHER TYPES
// -------------------------------------------------------------------------------------------------

export interface HistoricalSetupVector {
  mtfScore: number; // -100 to +100
  vwapSlope: number;
  adx: number;
  rvol: number;
  breadthScore: number;
  pcr: number;
  timeOfDayBucket: TimeOfDayBucket;
  dte: number;
}

export interface HistoricalSetupRecord {
  id: string;
  timestamp: string;
  underlying: string;
  symbol: string;
  vector: HistoricalSetupVector;
  direction: 'BUY' | 'SELL';
  outcome: 'WIN' | 'LOSS';
  returnR: number; // Return in units of R (e.g. +2.3R, -1.0R)
  mfeR: number; // Peak excursion in R
  maeR: number; // Max adverse excursion in R
  realizedPnlPct: number;
  exitReason: string;
  holdingTimeMins: number;
}

export interface MatchedHistoricalSetup {
  record: HistoricalSetupRecord;
  similarityScorePct: number; // 0-100% Euclidean closeness
  featureDistances: Record<string, number>;
}

export interface HistoricalMatcherResult {
  sampleSize: number; // N
  isStatisticallySignificant: boolean; // N >= 10
  historicalWinRatePct?: number; // STRICT: ONLY DISPLAYED IF N >= 10
  avgWinnerR?: number;
  avgLoserR?: number;
  expectancyInR?: number; // E = (WinRate * AvgWin) - (LossRate * AvgLoss)
  profitFactor?: number;
  statisticalConfidencePct: number;
  probabilityStatusMessage: string;
  matchedSetups: MatchedHistoricalSetup[];
}

// -------------------------------------------------------------------------------------------------
// WALK-FORWARD & OUT-OF-SAMPLE VALIDATION TYPES
// -------------------------------------------------------------------------------------------------

export interface BacktestPeriodMetrics {
  label: string;
  dateRange: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  expectancyInR: number;
  grossProfitINR: number;
  grossLossINR: number;
  netProfitINR: number;
  netReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  recoveryFactor: number; // Net Profit / Max Drawdown INR
  avgWinnerR: number;
  avgLoserR: number;
}

export interface WalkForwardValidationReport {
  id: string;
  strategyName: string;
  symbol: string;
  timeframe: '1m' | '5m';
  generatedAt: string;
  inSample: BacktestPeriodMetrics; // 60% Training / In-Sample
  outOfSample: BacktestPeriodMetrics; // 20% Validation / Out-of-Sample
  walkForward: BacktestPeriodMetrics; // 20% Forward Simulation
  walkForwardEfficiencyPct: number; // WFE = (OOS Annualized / IS Annualized) * 100
  parameterStabilityScore: number; // 0-100
  outOfSampleDegradationPct: number; // e.g. 5.1% drop
  isOverfitWarning: boolean;
  isPromotionApproved: boolean; // STRICT: Approved ONLY if OOS Net EV > 0 and WFE >= 60%
  promotionVerdict: string;
  totalTransactionCostINR: number;
  totalSlippageCostINR: number;
  trades: BacktestTrade[];
}

// -------------------------------------------------------------------------------------------------
// REGIME-TO-STRATEGY ROUTING & EVIDENCE-BASED TRADING TYPES
// -------------------------------------------------------------------------------------------------

export type MarketRegimeArchetype =
  | 'TREND_EXPANSION'
  | 'MEAN_REVERTING_CHOP'
  | 'VOLATILITY_SQUEEZE'
  | 'FAILED_BREAKOUT_TRAP'
  | 'HIGH_VOLATILITY_EXPANSION';

export type RoutedStrategyType =
  | 'EMA_VWAP_PULLBACK_TREND'
  | 'BREAKOUT_RETEST_EXPANSION'
  | 'VWAP_MEAN_REVERSION'
  | 'TRAP_FADE_REVERSAL'
  | 'VOLATILITY_SQUEEZE_FIRE'
  | 'NO_TRADE_CAPITAL_PRESERVATION';

export interface RoutedStrategyDecision {
  regime: MarketRegimeArchetype;
  regimeConfidencePct: number;
  regimeRationale: string;
  recommendedStrategy: RoutedStrategyType;
  strategyName: string;
  strategyDescription: string;
  requiredConditions: {
    name: string;
    met: boolean;
    currentValue: string;
    threshold: string;
  }[];
  isAllConditionsMet: boolean;
  executionReadiness: 'READY_FOR_EXECUTION' | 'STANDBY_AWAITING_TRIGGER' | 'BLOCKED_BY_REGIME' | 'NO_TRADE_ZONE';
  riskMultiplier: number; // 0.0x to 1.2x
}

export interface VolatilityPositionSizing {
  accountCapitalINR: number;
  riskBudgetPct: number; // e.g. 0.5% or 1.0%
  baseRiskBudgetINR: number; // e.g. ₹1,000
  volatilityScaleFactor: number; // 0.5x in high vol, 1.2x in low vol
  effectiveRiskINR: number; // baseRisk * volatilityFactor
  entryPrice: number;
  stopLossPrice: number;
  stopDistanceINR: number;
  stopDistancePct: number;
  atr14: number;
  instrumentLotSize: number;
  calculatedLots: number;
  calculatedQuantity: number;
  totalCapitalRequiredINR: number;
  maxDrawdownRiskINR: number;
  kellyFractionOptimal: number; // e.g. 0.28 (Fractional Kelly)
  netExpectancyINR: number;
  sizingRationale: string;
}

export interface TrendPersistenceProfile {
  kaufmanEfficiencyRatio: number; // 0.00 (Random/Noise) to 1.00 (Pure Directional Line)
  hurstProxy: number; // >0.55 Persistent, ~0.50 Random, <0.45 Anti-persistent/Mean Reverting
  persistenceScore: number; // 0 to 100
  persistenceRegime: 'STRONG_INSTITUTIONAL_PERSISTENCE' | 'MODERATE_TREND' | 'RANDOM_WALK_NOISE' | 'MEAN_REVERTING_CHOP';
  adxSlope: number; // Momentum inertia
  summary: string;
}

export interface TrapDetectionProfile {
  trapDetected: boolean;
  trapType: 'BULL_TRAP_EXPANSION' | 'BEAR_TRAP_BREAKDOWN' | 'LIQUIDITY_SWEEP_REJECTION' | 'NONE';
  sweptLevel: number;
  sweptLevelLabel: string; // e.g. 'Session High (PDH)', '15m ORB High'
  rejectionWickPct: number; // % of candle formed by rejection wick
  deltaDivergence: boolean; // Price made new high but delta/volume fell
  trapSeverity: 'HIGH_CONVICTION_TRAP' | 'MODERATE_TRAP' | 'NO_TRAP';
  tradingDirective: 'BLOCK_BREAKOUT_ENTRIES' | 'ROUTE_TO_TRAP_FADE' | 'NORMAL_FLOW';
  explanation: string;
}

export interface RelativeStrengthProfile {
  symbol: string;
  category: string;
  rsRatioVsNifty: number; // Relative strength vs Nifty 50 benchmark (>1.0 is outperforming)
  rsTrend: 'STRONG_OUTPERFORMER' | 'MILD_OUTPERFORMER' | 'MARKET_PERFORMER' | 'UNDERPERFORMER';
  constituentBreadthPct: number; // % of top Nifty heavyweights above VWAP
  heavyweightsAboveVwapCount: number; // e.g. 4 / 5
  sectorBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
}

export interface DynamicExitPlan {
  entryPrice: number;
  initialStopLoss: number;
  initialRiskR_INR: number; // 1R distance
  t1TargetPrice: number; // 1.5R target for 50% scale out
  t1TargetPct: number;
  t1TargetR: number;
  t1Quantity: number;
  t1ScaleOutPct: number; // 50%
  breakevenStopPrice: number; // Entry + Transaction Costs Buffer (₹40 round trip / lot)
  chandelierTrailDistanceINR: number; // 2.0x ATR
  chandelierCurrentTrailPrice: number; // Dynamic trailing stop for remaining 50%
  runnerTargetPrice: number; // 3.0R - 5.0R trend expansion target
  runnerTargetR: number;
  runnerQuantity: number;
  maxHoldingDurationMins: number; // Time stop (e.g. 25 mins for options)
  exitStrategySummary: string;
}

export interface RankedTradeOpportunity {
  rank: number;
  percentile: number; // Top 5%, 10%, 25%, etc.
  symbol: string;
  category: string;
  direction: 'BUY' | 'SELL';
  isOption: boolean;
  strikeOrProduct: string;
  currentLtp: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskRewardRatio: number;
  compositeEdgeScore: number; // 0 - 100
  regime: MarketRegimeArchetype;
  routedStrategy: string;
  persistenceScore: number;
  historicalExpectancyR: number;
  historicalWinRatePct: number;
  sampleSizeN: number;
  grossEvINR: number;
  estimatedTransactionCostsINR: number;
  netEvINR: number; // Net expected value in ₹ after full Indian taxes & slippage
  isTopPercentileApproved: boolean; // STRICT: Approved ONLY if top 15% and Composite Score >= 80 and Net EV > 0
  gatingVerdict: 'APPROVED_TOP_DECILE' | 'FILTERED_OUT_LOWER_PERCENTILE' | 'BLOCKED_NEGATIVE_NET_EV' | 'BLOCKED_DESTRUCTIVE_SETUP';
  rejectionReason?: string;
}

export interface DestructiveSetupCondition {
  id: string;
  name: string;
  description: string;
  historicalSampleSize: number;
  historicalWinRatePct: number;
  historicalExpectancyR: number;
  profitFactor: number;
  maxDrawdownPct: number;
  regime: string;
  timeOfDay: string;
  isCurrentlyActive: boolean;
  rejectionAction: 'STRICT_NO_TRADE_BLOCK';
  warningMessage: string;
}

export interface SetupMatrixRow {
  setupName: string;
  sampleSizeN: number;
  winRatePct: number;
  avgWinR: number;
  avgLossR: number;
  expectancyR: number;
  profitFactor: number;
  maxDrawdownPct: number;
  regime: string;
  timeOfDay: string;
  status: 'HIGH_EDGE_APPROVED' | 'MODERATE_EDGE' | 'DESTRUCTIVE_BLACKLISTED';
}




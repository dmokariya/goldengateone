// test/preLiveHardening.ts
// Automated Test Suite for GoldenGate Pre-Live Hardening & Execution Safety

import { evaluateContractQuantMetrics, parseContractSymbol, generateLiveSignals } from '../src/utils/quantEngine.js';
import { getChampionAndChallengerModels, computeOpportunityCostAnalysis } from '../src/utils/researchEngine.js';
import { evaluateEvidenceStack } from '../src/utils/edgeEngine.js';
import { resolveZerodhaInstrument } from '../server/instrumentMaster.js';
import { initRiskStore, setServerKillSwitch, recordTradeResult, getRiskState, updateRiskParameters } from '../server/riskStore.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runAllTests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING GOLDENGATE PRE-LIVE HARDENING & EXECUTION SAFETY TESTS');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------------
  // 1. DATA INTEGRITY & MISSING/STALE DATA TESTS
  // ---------------------------------------------------------------------------------
  console.log('--- 1. Missing & Stale Data Integrity Tests ---');

  // Test 1.1: Missing quote must result in NO live action and status DISCARDED / INSUFFICIENT_DATA
  const emptySignals = generateLiveSignals(undefined, undefined);
  const allDiscarded = emptySignals.every(s => s.status === 'DISCARDED' && s.source === 'INSUFFICIENT_DATA');
  assert(allDiscarded, 'Missing live quotes produces status DISCARDED and source INSUFFICIENT_DATA for all signals');

  // Test 1.2: Evaluated metric without live quote has 0 win probability and flags badTradeReason
  const unquotedMetric = evaluateContractQuantMetrics('NIFTY 24600 CE', 0, undefined);
  assert(unquotedMetric.winProbabilityPct === 0, 'Missing live quote sets winProbabilityPct to 0');
  assert(unquotedMetric.isBadTradeWarning === true, 'Missing live quote triggers isBadTradeWarning');
  assert(unquotedMetric.badTradeReason?.includes('NO LIVE KITE FEED') === true, 'Missing live quote displays NO LIVE KITE FEED warning');

  // ---------------------------------------------------------------------------------
  // 2. SENSEX_FNO & CONTRACT CLASSIFICATION TESTS
  // ---------------------------------------------------------------------------------
  console.log('\n--- 2. Instrument & SENSEX_FNO Classification Tests ---');

  // Test 2.1: SENSEX option parsed symbol and category
  const sensexParsed = parseContractSymbol('SENSEX 81000 CE');
  assert(sensexParsed.isSensex === true, 'parseContractSymbol correctly identifies SENSEX underlying');
  assert(sensexParsed.optionType === 'CE', 'parseContractSymbol correctly extracts CE option type');

  const sensexMetric = evaluateContractQuantMetrics('SENSEX 81000 CE', 150, { lastPrice: 150, changePct: 1.2 });
  assert(sensexMetric.category === 'SENSEX_FNO', 'SENSEX option is strictly classified as SENSEX_FNO (not generic equity)');

  // Test 2.2: Unknown malformed symbol resolution rejects without fake fallback
  const invalidInstrument = resolveZerodhaInstrument('NON_EXISTENT_FAKE_TICKER_99999');
  assert(invalidInstrument === null, 'Unknown symbol returns null (NO inferred fallback contract)');

  // ---------------------------------------------------------------------------------
  // 3. ZERO SYNTHETIC SEEDS & EMPIRICAL EVIDENCE INTEGRITY TESTS
  // ---------------------------------------------------------------------------------
  console.log('\n--- 3. Empirical Evidence & Zero-Seed Integrity Tests ---');

  // Test 3.1: Empty research logs yields INSUFFICIENT REAL EVIDENCE
  const models = getChampionAndChallengerModels([]);
  const champion = models[0];
  assert(champion.metrics.sampleSizeN === 0, 'Empty trade log reports sample size 0 on Champion model');
  assert(champion.metrics.winRatePct === 0, 'Empty trade log reports 0% win rate (no hardcoded win rates)');
  assert(champion.promotionChecklist.minSampleSizePassed === false, 'Empty trade log minSampleSizePassed is false');

  // Test 3.2: Opportunity cost analysis on empty logs yields INSUFFICIENT_DATA status
  const emptyOppCost = computeOpportunityCostAnalysis([]);
  assert(emptyOppCost.summary.includes('INSUFFICIENT REAL EVIDENCE'), 'Opportunity cost analysis reports INSUFFICIENT REAL EVIDENCE when no logs exist');

  // ---------------------------------------------------------------------------------
  // 4. RISK GATES, KILL SWITCH & LOSS LIMITS TESTS
  // ---------------------------------------------------------------------------------
  console.log('\n--- 4. Execution Safety & Risk Gate Circuit Breaker Tests ---');

  // Test 4.1: Server Kill Switch Engagement
  initRiskStore();
  updateRiskParameters({ dailyRealizedPnlINR: 0, consecutiveLossCount: 0 });
  const killState = setServerKillSwitch(true, 'Test emergency stop');
  assert(killState.isServerKillSwitchActive === true, 'Server Kill Switch successfully engages');

  const killCheck = getRiskState();
  assert(killCheck.isServerKillSwitchActive === true, 'Persistent risk store holds Kill Switch active state');

  // Disengage Kill Switch for next tests
  setServerKillSwitch(false, 'Reset for testing');

  // Test 4.2: Consecutive Losses Circuit Breaker
  recordTradeResult(-500);
  recordTradeResult(-600);
  const thirdLoss = recordTradeResult(-700);
  assert(thirdLoss.consecutiveLossCount === 3, 'Consecutive loss counter accurately tracks 3 consecutive losses');

  // Test 4.3: Daily Loss Limit Breached
  // Account equity is 100,000, 2% limit is -2,000. Add another loss to exceed -2,000
  recordTradeResult(-500);
  const stateAfterLosses = getRiskState();
  const maxDailyLossAllowed = -(stateAfterLosses.accountEquity * (stateAfterLosses.dailyLossLimitPct / 100));
  assert(stateAfterLosses.dailyRealizedPnlINR <= maxDailyLossAllowed, 'Daily loss limit (-₹2,000) breach accurately recorded');

  // ---------------------------------------------------------------------------------
  // 5. MULTI-PILLAR EVIDENCE CONFLICT & NO-TRADE ARBITRATION TESTS
  // ---------------------------------------------------------------------------------
  console.log('\n--- 5. Independent Confirmation Stacking & No-Trade Tests ---');

  // Test 5.1: Conflicting indicators result in NO_TRADE_EVIDENCE_CONFLICT
  const conflictingStack = evaluateEvidenceStack({
    mtf: { status: 'CONFLICTING_DIVERGENCE', summary: 'Trends diverging', timeframes: {} as any },
    vwap: { priceLocation: 'BELOW_VWAP', slope: 'FALLING', vwapBias: 'BEARISH', vwapValue: 24500, priceDistancePct: -0.5, summary: 'Below VWAP' },
    adx: { adx: 14, trendStrength: 'WEAK_CHOPPY', directionalBias: 'NEUTRAL', isOptionBuyPermitted: false, plusDi: 12, minusDi: 15, summary: 'Choppy' },
    rvol: { rvol: 0.4, volumeRegime: 'LOW_PARTICIPATION_TRAP', isInstitutionalParticipation: false, currentVolume: 1000, avgVolume20: 2500, summary: 'Low vol' },
    structure: { structureState: 'RANGE_BOUND', breakoutDirection: 'NONE', isRetestConfirmed: false, isTrapDetected: false, keySupportLevel: 24400, keyResistanceLevel: 24600, summary: 'Range' },
    breadth: { advanceDeclineRatio: 0.8, heavyweightsBullishCount: 2, heavyweightsBearishCount: 6, overallBreadthBias: 'MODERATE_BEARISH', summary: 'Bearish' },
    optionChain: { pcr: 0.7, pcrRegime: 'MODERATE_BEARISH', maxPainStrike: 24500, highCallOiStrike: 24600, highPutOiStrike: 24400, callOiChange: 'LONG_BUILDUP', putOiChange: 'SHORT_BUILDUP', ivPercentile: 40, ivSanityPassed: true, bias: 'BEARISH', summary: 'Bearish' },
    timeBucket: 'MORNING_TREND',
    intendedDirection: 'BUY',
    isOptionBuy: true
  });

  assert(conflictingStack.finalDecision.startsWith('NO_TRADE'), 'Conflicting directional signals strictly output NO_TRADE decision');
  assert(conflictingStack.conflictDetected === true, 'conflictDetected flag is true when indicators diverge');

  console.log('\n===============================================================');
  console.log(`🏁 TEST RUN COMPLETE: ${passedCount}/${totalCount} TESTS PASSED (${((passedCount / totalCount) * 100).toFixed(0)}%)`);
  console.log('===============================================================\n');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});

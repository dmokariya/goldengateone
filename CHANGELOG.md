# CHANGELOG & COMMIT LOG

This document tracks all changes, feature implementations, and quantitative architecture upgrades for every GitHub push/release of the **GoldenGate Terminal** (Zerodha Algo Trading & Quant Platform).

---

## 📅 Commit & Release History

### [v2.6.0] - Unbypassable Server-Side Pre-Trade Risk Gate & Persistent RMS Architecture
**Date**: 2026-08-20  
**Summary**: Hardened `/api/zerodha/execute-order` to make pre-trade risk validation completely unbypassable. Orders now internally fetch fresh Zerodha quotes and depth, strictly resolve instruments with zero heuristic fallback, derive contract lot sizes exclusively from the live instrument master, enforce risk-sized quantities, protect administrative risk endpoints, and persist critical risk state across server restarts.

#### 🚀 Key Features & Changes:
1. **Unbypassable Server-Side Order Execution Gate (`server.ts`)**:
   - Eliminated all heuristic fallback lot sizes and exchanges in order execution. If an instrument cannot be resolved from the official Zerodha master index, execution is aborted with `UNRESOLVED_INSTRUMENT` (HTTP 422).
   - Internally queries Zerodha Kite live quote & order book depth directly inside the server pipeline prior to placing any orders.
   - Enforces market session gates (IST 09:15-15:15 validation), daily loss limits, and consecutive loss cooldowns natively on the server.
   - Rechecks live price slippage and book bid-ask spread against live depth.
   - Derives quantity strictly from account equity risk budget and verified instrument lot size.

2. **Persistent Risk Store & State Engine (`server/riskStore.ts`)**:
   - Persists kill switch status, daily realized PnL, consecutive loss count, and risk parameters to disk (`data/server_risk_state.json`) to survive server restarts.
   - Automatic IST midnight rollover detection to reset daily trading statistics.
   - Records order placement and trade results seamlessly.

3. **Protected Risk Management Endpoints**:
   - Secured `/api/server/kill-switch`, `/api/server/risk-state`, and `/api/zerodha/record-trade-result` with session and authorization verification (`isAuthorizedRiskRequest`).

---

### [v2.5.0] - Independent Pre-Trade Risk Gate & Strategy Attribution Architecture
**Date**: 2026-08-20  
**Summary**: Decoupled Signal Generation from Pre-Trade Execution Risk validation, added multi-factor Quantitative Strategy Attribution (GoldenGate score), net expected value with fee deductions, synthetic data isolation, and server-side kill switch controls.

#### 🚀 Key Features & Changes:
1. **Independent Pre-Trade Risk & Execution Gate (`src/utils/riskGate.ts`, `server.ts`)**:
   - Implemented strict 8-factor validation before order routing:
     - Server-side emergency kill switch check.
     - Account equity daily loss circuit breaker (-2% max drawdown).
     - Consecutive loss cooldown gate (3 losses pauses execution).
     - IST Market session validation (Pre-open, Regular 09:15-15:15, Square-off 15:15-15:30, Closed).
     - Live quote freshness threshold (3000ms max latency).
     - Bid-Ask spread & depth validation (≤ 1.5% maximum spread).
     - Price slippage check against live LTP (≤ 2.0% tolerance).
     - Portfolio directional correlation limit (max 3 concurrent directional trades).
   - Added `/api/zerodha/validate-pre-trade` and `/api/server/kill-switch` server endpoints.

2. **Multi-Factor Strategy Attribution & GoldenGate Score (`src/utils/quantEngine.ts`)**:
   - Replaced unexplainable probabilistic models with transparent multi-factor scoring:
     - Regime & Trend Confluence (20 pts).
     - Technical Momentum / RSI / EMA (15 pts).
     - Option Greeks & Delta Quality (15 pts).
     - Liquidity & Book Depth (15 pts).
     - Market Microstructure / Support-Resistance (10 pts).
     - Net Risk-Reward Ratio (10 pts).
   - Integrated realistic round-trip exchange fees & STT/brokerage deductions into Net Expected Value (`netExpectedValueINR`).

3. **Synthetic Data Isolation**:
   - Renamed synthetic generator to `generateDemoCandles` to guarantee no synthetic data feeds live trading signals, backtests, or order execution.

4. **UI Attribution & Risk Visualizer (`src/components/LiveSignalsView.tsx`)**:
   - Added Confluence Score badges (e.g., `Score 85/100`), Net EV indicators, and complete factor attribution scorecards to signal cards.

---

### [v2.4.0] - Universal Real Data Rule & Black-Scholes Mathematical Engine
**Date**: 2026-08-20  
**Summary**: Removed mock fallback data, implemented full Black-Scholes continuous pricing and Greeks solver, and established the strict universal rule: `NO LIVE DATA = NO SIGNAL = NO ORDER`.

#### 🚀 Key Features & Changes:
1. **Mathematical Black-Scholes Options Engine (`src/utils/quantEngine.ts`)**:
   - Implemented exact $d_1, d_2$ formulations, standard normal cumulative distribution ($\Phi(x)$) and probability density ($\phi(x)$).
   - Analytical Greeks calculation:
     - Delta ($\Delta$): Exact price sensitivity for Calls and Puts.
     - Gamma ($\Gamma$): Option Delta acceleration with moneyness curvature.
     - Theta ($\Theta$): Daily premium time decay in INR.
     - Vega ($\nu$): Option price sensitivity per 1% change in Implied Volatility.
     - In-the-money (ITM) exact probability: $N(d_2)$.
   - Newton-Raphson numerical solver for deriving true Implied Volatility (IV, $\sigma$) from live market prices.

2. **Universal Real Data Rule (`NO LIVE DATA = NO SIGNAL = NO ORDER`)**:
   - `/api/quotes` and `/api/zerodha/quotes` return strictly live market quotes. No artificial mock ticks or synthetic quotes.
   - When Zerodha Kite is disconnected, the terminal displays `DISCONNECTED` status and signals are tagged `INSUFFICIENT_DATA`.
   - The Automated Trading Engine (`App.tsx`) halts order dispatch if live market quote provenance (`source === 'ZERODHA_KITE_LIVE'`) is missing.

3. **Dynamic Market Regime Detection**:
   - Replaced static regime assumptions with dynamic spot index evaluations using EMA 9/21 ribbons, VWAP position, RSI(14) momentum, and India VIX thresholds.

4. **Zerodha Historical Candle Proxy**:
   - Added `/api/zerodha/historical` endpoint supporting 1m, 5m, 15m, 60m, and daily intervals directly via Kite Connect instrument tokens.

---

### [v2.3.0] - Exchange Slicing, Slippage Protection & Risk Gateways
**Date**: 2026-08-19  
**Summary**: Institutional order management with NSE Freeze limit auto-slicing and slippage guard buffers.

#### 🚀 Key Features & Changes:
1. **Exchange Freeze Limit Slicer (`autoSliceOrderQuantity`)**:
   - Automatically slices multi-lot orders exceeding exchange limits (NIFTY: 1,800 qty, BANKNIFTY: 900 qty, FINNIFTY: 1,800 qty, SENSEX: 1,000 qty).
2. **Slippage-Protected Limit Execution (`calculateSlippageProtectedPrice`)**:
   - Converts market orders into buffered limit orders (0.25%, 0.50%, 1.00%) to safeguard against illiquid book spread gaps.
3. **Emergency Square-Off Kill Switch**:
   - 1-click master kill switch to cancel all open orders and market-exit open positions simultaneously.

---

### [v2.2.0] - Disciplined Profit-Only Auto-Trader & Trailing Stop Loss
**Date**: 2026-08-18  
**Summary**: Intelligent auto-trader execution loop with dynamic Break-Even and Profit Locking rules.

#### 🚀 Key Features & Changes:
1. **Disciplined Entry Filter**:
   - Only enters trades with $\ge 80\%$ calibrated win probability, positive Expected Value ($\text{EV} > 0$), and no counter-trend or OTM theta trap warnings.
2. **Dynamic Trailing Stop Loss**:
   - **+5% Profit**: Moves Stop Loss to Break-Even price.
   - **+10% Profit**: Locks in a minimum +5% guaranteed profit floor.
3. **15-Minute Theta Decay Exit Rule**:
   - Automatically triggers position exit if an option trade remains flat for 15 minutes to preserve capital against Theta decay.

---

### [v2.1.0] - Comprehensive F&O Catalog & Contract Categorization
**Date**: 2026-08-17  
**Summary**: Full matrix of NIFTY, BANKNIFTY, FINNIFTY, SENSEX, and liquid intraday equities.

#### 🚀 Key Features & Changes:
1. **Active Option Matrix**:
   - Real strike chains across ITM, ATM, and OTM strikes.
   - Categorized by Delta brackets (Deep ITM: $\Delta \ge 0.65$, ATM: $\Delta \approx 0.50$, OTM: $\Delta \le 0.35$).
2. **Bad Trade & Theta Trap Warning Badges**:
   - Visually flags low-delta speculative out-of-the-money options to protect retail traders.

---

### [v2.0.0] - Zerodha Kite Connect Production Bridge & Full-Stack Node.js Architecture
**Date**: 2026-08-15  
**Summary**: Transitioned to full-stack Express + Vite architecture with secure server-side Zerodha Kite Connect proxy.

#### 🚀 Key Features & Changes:
1. **Server-Side API Proxy (`server.ts`)**:
   - Full Kite Connect v3 REST client for user profile, orders, positions, margins, quotes, and webhooks.
   - Encrypted session credential handling on the backend.
2. **UI Redesign**:
   - High-contrast institutional dark trading terminal styling with responsive Tailwind CSS components.

---

## 📝 Guidelines for Future GitHub Commits

When preparing a new commit and push to GitHub, update this file using the following structure:

```markdown
### [vX.Y.Z] - <Descriptive Title>
**Date**: YYYY-MM-DD  
**Summary**: 1-2 sentence overview of what was changed and why.

#### 🚀 Key Features & Changes:
1. **Component / Module Name**:
   - Bullet points outlining functional and mathematical changes.
2. **API & Backend Updates**:
   - List any new or updated endpoints.
3. **Risk & Safety Controls**:
   - List any new execution gates, bounds, or safeguards added.
```

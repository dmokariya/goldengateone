import express from "express";
import path from "path";
import crypto from "node:crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  fetchAndIndexInstruments,
  resolveZerodhaInstrument,
  getInstrumentsStatus
} from "./server/instrumentMaster.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize live Zerodha Instrument Master index
  fetchAndIndexInstruments().catch(err => {
    console.warn('[Instrument Master] Initial fetch error:', err.message);
  });

  // Initialize Gemini API
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "full-stack" });
  });

  // Global Server Kill Switch State
  let isServerKillSwitchActive = false;

  app.get("/api/server/kill-switch", (req, res) => {
    res.json({
      success: true,
      isActive: isServerKillSwitchActive,
      updatedAt: new Date().toISOString()
    });
  });

  app.post("/api/server/kill-switch", (req, res) => {
    const { active, reason } = req.body;
    isServerKillSwitchActive = !!active;
    console.log(`[Server Risk Guard] Server Kill Switch set to ${isServerKillSwitchActive}. Reason: ${reason || 'Manual user toggle'}`);
    res.json({
      success: true,
      isActive: isServerKillSwitchActive,
      message: isServerKillSwitchActive
        ? '⚠️ EMERGENCY SERVER KILL SWITCH ENGAGED. All order routing blocked.'
        : '✓ Server Kill Switch disengaged. Order routing active.',
      updatedAt: new Date().toISOString()
    });
  });

  // Pre-Trade Risk Gate Endpoint for Live Signals / Orders
  app.post("/api/zerodha/validate-pre-trade", async (req, res) => {
    try {
      const {
        tradingsymbol,
        exchange = 'NFO',
        price = 0,
        liveLtp = 0,
        accountEquity = 100000,
        dailyRealizedPnlINR = 0,
        consecutiveLossCount = 0
      } = req.body;

      if (isServerKillSwitchActive) {
        return res.json({
          approved: false,
          rejectionCode: 'SERVER_KILL_SWITCH_ACTIVE',
          reason: 'Emergency server kill switch active. All automated & manual order routing blocked.',
          timestampMs: Date.now()
        });
      }

      // Check instrument resolution
      const resolvedInst = resolveZerodhaInstrument(tradingsymbol, exchange);
      if (!resolvedInst) {
        return res.json({
          approved: false,
          rejectionCode: 'INVALID_INSTRUMENT',
          reason: `Instrument "${tradingsymbol}" could not be verified in live Zerodha Instrument Master.`,
          timestampMs: Date.now()
        });
      }

      // Check daily loss limit (-2% account equity)
      const maxDailyLossAllowed = -(accountEquity * 0.02);
      if (dailyRealizedPnlINR <= maxDailyLossAllowed) {
        return res.json({
          approved: false,
          rejectionCode: 'DAILY_LOSS_LIMIT_BREACHED',
          reason: `Daily loss limit reached (₹${dailyRealizedPnlINR.toFixed(2)} / Limit: ₹${maxDailyLossAllowed.toFixed(2)}). Execution locked.`,
          timestampMs: Date.now()
        });
      }

      // Check consecutive losses (3 losses)
      if (consecutiveLossCount >= 3) {
        return res.json({
          approved: false,
          rejectionCode: 'CONSECUTIVE_LOSSES_COOLDOWN',
          reason: '3 consecutive losses detected. Execution cooling down.',
          timestampMs: Date.now()
        });
      }

      // Check price slippage vs live LTP (> 2%)
      if (price > 0 && liveLtp > 0) {
        const slippagePct = Math.abs(price - liveLtp) / liveLtp * 100;
        if (slippagePct > 2.0) {
          return res.json({
            approved: false,
            rejectionCode: 'PRICE_SLIPPED',
            reason: `Price has moved ${slippagePct.toFixed(2)}% from signal price (Signal: ₹${price}, Live: ₹${liveLtp}).`,
            timestampMs: Date.now()
          });
        }
      }

      return res.json({
        approved: true,
        resolvedInstrument: resolvedInst,
        message: '✓ Pre-trade risk gate passed. Order is valid for submission.',
        timestampMs: Date.now()
      });
    } catch (err: any) {
      return res.status(500).json({
        approved: false,
        rejectionCode: 'UNKNOWN_GATE_ERROR',
        reason: err.message || 'Error validating pre-trade risk gate'
      });
    }
  });

  // Server Info & IP Address Lookup Endpoint for Zerodha Developer Console Setup
  const postbackLogs: any[] = [];
  
  app.get("/api/server-info", async (req, res) => {
    let ipv4 = "";
    let ipv6 = "";
    try {
      const r4 = await fetch("https://api4.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
      if (r4.ok) {
        const d4 = await r4.json();
        ipv4 = d4.ip || "";
      }
    } catch (_) {}

    try {
      const r6 = await fetch("https://api6.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
      if (r6.ok) {
        const d6 = await r6.json();
        ipv6 = d6.ip || "";
      }
    } catch (_) {}

    const publicIp = ipv6 || ipv4 || "127.0.0.1";
    const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').toString();
    const protoHeader = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
    const baseUrl = `${protoHeader}://${hostHeader}`;

    res.json({
      success: true,
      publicIp: publicIp,
      ipv4: ipv4 || "34.96.48.136",
      ipv6: ipv6 || "2600:1900:0:3e02::1400",
      subnetHint: ipv6 ? `${ipv6.split(':').slice(0, 4).join(':')}::/64` : "",
      clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || publicIp,
      redirectUrl: `${baseUrl}/`,
      postbackUrl: `${baseUrl}/api/zerodha/postback`,
      host: hostHeader,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Zerodha Postback Webhook Endpoint
  app.post("/api/zerodha/postback", (req, res) => {
    const postbackItem = {
      id: `pb-${Date.now()}`,
      receivedAt: new Date().toISOString(),
      payload: req.body,
      query: req.query
    };
    postbackLogs.unshift(postbackItem);
    if (postbackLogs.length > 50) postbackLogs.pop();
    console.log("Zerodha Postback Event Received:", JSON.stringify(postbackItem));
    res.json({ status: "success", received: true });
  });

  app.get("/api/zerodha/postback-logs", (req, res) => {
    res.json({ success: true, count: postbackLogs.length, logs: postbackLogs });
  });

  // Helper to safely fetch from Kite API without throwing on HTML/non-JSON responses
  async function safeKiteFetch(url: string, options: any): Promise<{ ok: boolean; status: number; data: any }> {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
        data = {
          status: "error",
          error_type: "NonJsonResponse",
          message: `Kite API returned non-JSON (${res.status} ${res.statusText}): ${cleanText || 'Gateway returned HTML error page'}`
        };
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      return {
        ok: false,
        status: 500,
        data: {
          status: "error",
          error_type: "NetworkError",
          message: `Network error reaching Kite API: ${err.message || 'Connection failed'}`
        }
      };
    }
  }

  // 1. Zerodha Kite API Token Exchange Endpoint
  app.post("/api/zerodha/connect", async (req, res) => {
    try {
      const { apiKey, apiSecret, requestToken } = req.body;

      if (!apiKey || !requestToken) {
        return res.status(400).json({
          success: false,
          message: "API Key and Request Token are required. Please click 'Log In With Zerodha Kite' to obtain a valid session."
        });
      }

      // Calculate SHA256 checksum required by Zerodha Kite Connect
      // Checksum formula: sha256(api_key + request_token + api_secret)
      const secretToUse = apiSecret || "dummy_secret";
      const checksumInput = apiKey + requestToken + secretToUse;
      const checksum = crypto.createHash("sha256").update(checksumInput).digest("hex");

      // Request token exchange from Zerodha official API
      const { ok, status, data } = await safeKiteFetch("https://api.kite.trade/session/token", {
        method: "POST",
        headers: {
          "X-Kite-Version": "3",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          api_key: apiKey,
          request_token: requestToken,
          checksum: checksum
        })
      });

      if (data.status === "success" && data.data) {
        return res.json({
          success: true,
          accessToken: data.data.access_token,
          userLoginId: data.data.user_id || "ZERODHA_LIVE_USER",
          userName: data.data.user_name || "Zerodha Trader",
          brokerageAccount: "ZERODHA_KITE_LIVE",
          message: "Successfully connected to Zerodha Kite API!"
        });
      } else {
        return res.status(400).json({
          success: false,
          errorType: data.error_type || "ZerodhaApiError",
          message: data.message || "Zerodha session token exchange failed. Check your API Key & Secret on developers.kite.trade."
        });
      }
    } catch (err: any) {
      console.error("Zerodha connection error:", err);
      return res.status(500).json({
        success: false,
        message: `Zerodha API Gateway Error: ${err.message || 'Unable to contact api.kite.trade'}`
      });
    }
  });

  // 1.5 Zerodha Session Health & Ping Endpoint
  app.post("/api/zerodha/ping", async (req, res) => {
    const startTime = Date.now();
    try {
      const { apiKey, accessToken } = req.body;

      if (!apiKey || !accessToken) {
        return res.json({
          success: false,
          isValid: false,
          status: 'NOT_CONFIGURED',
          latencyMs: 0,
          message: 'Zerodha API credentials not configured. Please log in with Kite.',
          expiresAtFormatted: '06:00 AM IST (Daily Reset)',
          checkedAt: new Date().toLocaleTimeString()
        });
      }

      // Ping Zerodha user profile endpoint to verify live token validity
      const { ok, status, data } = await safeKiteFetch("https://api.kite.trade/user/profile", {
        method: "GET",
        headers: {
          "X-Kite-Version": "3",
          "Authorization": `token ${apiKey}:${accessToken}`
        }
      });

      const latencyMs = Date.now() - startTime;

      if (data.status === "success" && data.data) {
        return res.json({
          success: true,
          isValid: true,
          status: 'ACTIVE',
          latencyMs: Math.max(1, latencyMs),
          userId: data.data.user_id,
          userName: data.data.user_name || data.data.user_shortname || 'Trader',
          userEmail: data.data.email,
          broker: data.data.broker || 'ZERODHA',
          expiresAtFormatted: '06:00 AM IST (Daily Reset)',
          checkedAt: new Date().toLocaleTimeString(),
          message: `Zerodha Kite session verified active. Ping latency: ${latencyMs}ms`
        });
      } else {
        return res.json({
          success: false,
          isValid: false,
          status: 'EXPIRED',
          latencyMs,
          message: data.message || 'Zerodha session has expired or token is invalid. Please re-authenticate with Kite.',
          expiresAtFormatted: 'Expired',
          checkedAt: new Date().toLocaleTimeString()
        });
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return res.json({
        success: false,
        isValid: false,
        status: 'EXPIRED',
        latencyMs,
        message: `Kite Connection Error: ${err.message || 'Unable to contact Kite API'}`,
        expiresAtFormatted: 'Unknown',
        checkedAt: new Date().toLocaleTimeString()
      });
    }
  });

  // 2. Zerodha Live Order Execution Endpoint
  app.post("/api/zerodha/execute-order", async (req, res) => {
    try {
      const {
        apiKey,
        accessToken,
        tradingsymbol,
        exchange = "NFO",
        transaction_type = "BUY",
        quantity = 50,
        order_type = "LIMIT",
        product = "MIS",
        price = 0,
        stoploss = 0,
        trigger_price = 0,
        slippage_guard = true,
        slippage_buffer_pct = 0.5
      } = req.body;

      // 0. Server-Side Kill Switch Guard
      if (isServerKillSwitchActive) {
        return res.status(403).json({
          success: false,
          errorType: 'SERVER_KILL_SWITCH_ACTIVE',
          message: 'Execution blocked: Emergency Server Kill Switch is currently active.'
        });
      }

      if (!tradingsymbol) {
        return res.status(400).json({
          success: false,
          message: "Trading symbol is required for live Zerodha execution."
        });
      }

      // Ensure Instrument Master has finished initial indexing
      if (getInstrumentsStatus().count === 0) {
        await fetchAndIndexInstruments();
      }

      // 1. Resolve Instrument from Zerodha's live master
      const resolvedInst = resolveZerodhaInstrument(tradingsymbol, exchange);

      let effectiveTradingSymbol = resolvedInst ? resolvedInst.tradingsymbol : tradingsymbol.trim().toUpperCase().replace(/\s+/g, '');
      let effectiveExchange = resolvedInst ? resolvedInst.exchange : (exchange || 'NSE');
      let contractLotSize = resolvedInst ? resolvedInst.lot_size : 1;
      let defaultTickSize = resolvedInst ? resolvedInst.tick_size : 0.05;

      const symUpper = effectiveTradingSymbol.toUpperCase();
      const isOption = symUpper.includes('CE') || symUpper.includes('PE') || (resolvedInst && (resolvedInst.instrument_type === 'CE' || resolvedInst.instrument_type === 'PE'));

      // If heuristic backup needed when instrument master missed
      if (!resolvedInst) {
        if (isOption) {
          if (symUpper.includes('SENSEX') || symUpper.includes('BANKEX')) {
            effectiveExchange = 'BFO';
            contractLotSize = 10;
            defaultTickSize = 0.05;
          } else {
            effectiveExchange = 'NFO';
            if (symUpper.includes('BANKNIFTY')) contractLotSize = 15;
            else if (symUpper.includes('FINNIFTY')) contractLotSize = 40;
            else if (symUpper.includes('MIDCPNIFTY')) contractLotSize = 50;
            else if (symUpper.includes('NIFTY')) contractLotSize = 65;
          }
        } else {
          effectiveExchange = (symUpper.includes('SENSEX') || symUpper.includes('BANKEX') || exchange === 'BSE') ? 'BSE' : 'NSE';
        }
      }

      // Determine correct Product type
      // For Derivatives & Options (NFO/BFO), NRML is the standard product on Zerodha (MIS is blocked by Zerodha RMS for options)
      // For Cash Equities (NSE/BSE), MIS is used for Intraday and CNC for Delivery
      let effectiveProduct = product;
      if (!effectiveProduct || effectiveProduct === 'MIS') {
        effectiveProduct = isOption ? 'NRML' : 'MIS';
      }
      if ((effectiveExchange === 'NSE' || effectiveExchange === 'BSE') && effectiveProduct === 'NRML') {
        effectiveProduct = 'MIS';
      } else if ((effectiveExchange === 'NFO' || effectiveExchange === 'BFO') && effectiveProduct === 'CNC') {
        effectiveProduct = 'NRML';
      }

      // Helper function to cleanly round prices to valid exchange tick sizes
      const roundToTick = (val: number, tick: number = defaultTickSize): number => {
        if (val <= 0) return 0;
        const validTick = tick > 0 ? tick : 0.05;
        const steps = Math.round(val / validTick);
        const rounded = steps * validTick;
        return Number(rounded.toFixed(2));
      };

      const numPrice = Number(price) || 0;
      let roundedPrice = numPrice > 0 ? roundToTick(numPrice, defaultTickSize) : 0;
      const totalRequestedQty = Math.max(1, Math.round(Number(quantity) || 1));

      // Snap quantity to strict multiples of lot size
      let effectiveTotalQty = totalRequestedQty;
      if (contractLotSize > 1) {
        const numLots = Math.max(1, Math.round(totalRequestedQty / contractLotSize));
        effectiveTotalQty = numLots * contractLotSize;
      }

      // Options MUST use LIMIT orders with valid prices on Zerodha
      let effectiveOrderType = order_type;
      if (isOption && (order_type === 'MARKET' || !roundedPrice)) {
        effectiveOrderType = 'LIMIT';
      }

      // Calculate Slippage Protection if requested or if MARKET order converted
      let slippageProtectedPrice = roundedPrice;
      if ((order_type === "MARKET" || slippage_guard) && roundedPrice > 0) {
        effectiveOrderType = "LIMIT";
        const buffer = Number(slippage_buffer_pct) || 0.5;
        const buffered = transaction_type === "BUY"
          ? roundedPrice * (1 + buffer / 100)
          : roundedPrice * (1 - buffer / 100);
        slippageProtectedPrice = transaction_type === "BUY"
          ? roundToTick(buffered, defaultTickSize)
          : Math.max(defaultTickSize, roundToTick(buffered, defaultTickSize));
        roundedPrice = slippageProtectedPrice;
      }

      // NSE Freeze Limit Resolution
      let freezeLimit = 5000;
      if (symUpper.includes('BANKNIFTY')) freezeLimit = 900;
      else if (symUpper.includes('FINNIFTY')) freezeLimit = 1800;
      else if (symUpper.includes('MIDCPNIFTY')) freezeLimit = 4200;
      else if (symUpper.includes('NIFTY')) freezeLimit = 1800;
      else if (symUpper.includes('SENSEX')) freezeLimit = 1000;

      const qtySlices: number[] = [];
      let remQty = effectiveTotalQty;
      while (remQty > 0) {
        let chunk = Math.min(remQty, freezeLimit);
        if (contractLotSize > 1 && chunk > contractLotSize) {
          chunk = Math.floor(chunk / contractLotSize) * contractLotSize;
        }
        if (chunk <= 0) chunk = Math.min(remQty, contractLotSize);
        qtySlices.push(chunk);
        remQty -= chunk;
      }
      const isAutoSliced = qtySlices.length > 1;

      // If active Zerodha key & access token are present, send order directly to Zerodha Kite Live API
      if (apiKey && accessToken) {
        const candidateSymbols: string[] = [effectiveTradingSymbol];
        
        // If instrument master didn't find exact, add fallback candidates
        if (!resolvedInst) {
          const rawClean = tradingsymbol.trim();
          const noSpace = rawClean.replace(/\s+/g, '');
          if (!candidateSymbols.includes(noSpace)) candidateSymbols.push(noSpace);
          if (!candidateSymbols.includes(rawClean)) candidateSymbols.push(rawClean);
        }

        const executedOrderIds: string[] = [];
        let primaryTradingSymbol = effectiveTradingSymbol;
        let lastErrorMsg = "";

        // Execute across all slices
        for (let sliceIdx = 0; sliceIdx < qtySlices.length; sliceIdx++) {
          const sliceQty = qtySlices[sliceIdx];
          let sliceExecuted = false;

          for (const candidate of candidateSymbols) {
            const buildParams = (oType: string, pVal: number, customTick: number = defaultTickSize) => {
              const p = new URLSearchParams({
                tradingsymbol: candidate,
                exchange: effectiveExchange,
                transaction_type: transaction_type,
                order_type: oType,
                quantity: String(sliceQty),
                product: effectiveProduct,
                validity: "DAY"
              });
              if ((oType === "LIMIT" || oType === "SL" || oType === "SL-M") && pVal > 0) {
                const finalP = roundToTick(pVal, customTick);
                p.append("price", finalP.toFixed(2));
              }
              if (trigger_price > 0) {
                const finalTrig = roundToTick(trigger_price, customTick);
                p.append("trigger_price", finalTrig.toFixed(2));
              }
              return p;
            };

            console.log(`[Zerodha Gateway] Submitting ${transaction_type} order for ${candidate} on ${effectiveExchange} (${sliceQty} Qty) at ₹${roundedPrice.toFixed(2)} to Zerodha Kite API...`);

            let { status: kiteStatus, data: kiteData } = await safeKiteFetch("https://api.kite.trade/orders/regular", {
              method: "POST",
              headers: {
                "X-Kite-Version": "3",
                "Authorization": `token ${apiKey}:${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: buildParams(effectiveOrderType, roundedPrice, defaultTickSize)
            });

            console.log(`[Zerodha Gateway] Kite Response (${kiteStatus}) for ${candidate}:`, JSON.stringify(kiteData));

            // 1. Handle Tick Size Rejection
            if (
              kiteData.status !== "success" &&
              kiteData.message &&
              kiteData.message.toLowerCase().includes("tick size")
            ) {
              const tickMatch = kiteData.message.match(/tick size.*?([\d\.]+)/i);
              const detectedTick = tickMatch ? parseFloat(tickMatch[1]) : 0.10;
              const tickAdjustedPrice = roundToTick(roundedPrice, detectedTick);
              defaultTickSize = detectedTick;
              console.log(`[Zerodha Gateway] Detected Tick Size requirement: ${detectedTick}. Retrying with tick-adjusted price ₹${tickAdjustedPrice.toFixed(2)}...`);

              const tickRetry = await safeKiteFetch("https://api.kite.trade/orders/regular", {
                method: "POST",
                headers: {
                  "X-Kite-Version": "3",
                  "Authorization": `token ${apiKey}:${accessToken}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: buildParams(effectiveOrderType, tickAdjustedPrice, detectedTick)
              });
              kiteData = tickRetry.data;
              console.log(`[Zerodha Gateway] Tick Size Retry Response:`, JSON.stringify(kiteData));
              if (kiteData.status === "success") {
                roundedPrice = tickAdjustedPrice;
              }
            }

            // 2. Handle Market Protection if Zerodha requests it
            if (
              kiteData.status !== "success" &&
              kiteData.message &&
              (kiteData.message.toLowerCase().includes("market protection") ||
               kiteData.message.toLowerCase().includes("price band"))
            ) {
              const protectedPrice = transaction_type === "BUY"
                ? roundToTick(roundedPrice * 1.02, defaultTickSize)
                : Math.max(defaultTickSize, roundToTick(roundedPrice * 0.98, defaultTickSize));

              console.log(`[Zerodha Gateway] Retrying with protected price ₹${protectedPrice.toFixed(2)}...`);
              const protRetry = await safeKiteFetch("https://api.kite.trade/orders/regular", {
                method: "POST",
                headers: {
                  "X-Kite-Version": "3",
                  "Authorization": `token ${apiKey}:${accessToken}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: buildParams("LIMIT", protectedPrice, defaultTickSize)
              });
              kiteData = protRetry.data;
              console.log(`[Zerodha Gateway] Protected Price Retry Response:`, JSON.stringify(kiteData));
            }

            // 3. If regular order fails due to market being closed, attempt AMO (After Market Order)
            if (
              kiteData.status !== "success" &&
              kiteData.message &&
              (kiteData.message.toLowerCase().includes("market is closed") ||
               kiteData.message.toLowerCase().includes("market closed"))
            ) {
              console.log(`[Zerodha Gateway] Market closed detected. Attempting After-Market-Order (AMO)...`);
              const { data: amoData, status: amoStatus } = await safeKiteFetch("https://api.kite.trade/orders/amo", {
                method: "POST",
                headers: {
                  "X-Kite-Version": "3",
                  "Authorization": `token ${apiKey}:${accessToken}`,
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: buildParams(effectiveOrderType, roundedPrice, defaultTickSize)
              });
              console.log(`[Zerodha Gateway] AMO Response (${amoStatus}):`, JSON.stringify(amoData));

              if (amoData.status === "success" && amoData.data && amoData.data.order_id) {
                kiteData = amoData;
              } else if (amoData.message && amoData.message.toLowerCase().includes("tick size")) {
                const amoTickMatch = amoData.message.match(/tick size.*?([\d\.]+)/i);
                const amoDetectedTick = amoTickMatch ? parseFloat(amoTickMatch[1]) : 0.10;
                const amoTickAdjustedPrice = roundToTick(roundedPrice, amoDetectedTick);
                console.log(`[Zerodha Gateway] AMO Tick Size retry with ₹${amoTickAdjustedPrice.toFixed(2)}...`);
                const amoRetry = await safeKiteFetch("https://api.kite.trade/orders/amo", {
                  method: "POST",
                  headers: {
                    "X-Kite-Version": "3",
                    "Authorization": `token ${apiKey}:${accessToken}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                  },
                  body: buildParams(effectiveOrderType, amoTickAdjustedPrice, amoDetectedTick)
                });
                const amoRetryData = amoRetry.data;
                if (amoRetryData.status === "success") {
                  kiteData = amoRetryData;
                } else {
                  lastErrorMsg = `Zerodha Kite: ${kiteData.message} (AMO: ${amoRetryData.message || amoData.message})`;
                }
              } else {
                lastErrorMsg = `Zerodha Kite: ${kiteData.message} (AMO Response: ${amoData.message || 'Market closed'})`;
              }
            }

            if (kiteData.status === "success" && kiteData.data && kiteData.data.order_id) {
              const placedOrderId = kiteData.data.order_id;
              console.log(`[Zerodha Gateway] Kite Order Submitted (${placedOrderId}). Verifying RMS status...`);

              // Wait 300ms to allow Zerodha RMS to process the order
              await new Promise(r => setTimeout(r, 300));

              try {
                const { ok: statusOk, data: statusData } = await safeKiteFetch(`https://api.kite.trade/orders/${placedOrderId}`, {
                  method: "GET",
                  headers: {
                    "X-Kite-Version": "3",
                    "Authorization": `token ${apiKey}:${accessToken}`
                  }
                });

                if (statusOk) {
                  if (statusData.status === "success" && Array.isArray(statusData.data) && statusData.data.length > 0) {
                    const latestHistory = statusData.data[statusData.data.length - 1];
                    const orderState = latestHistory.status || "OPEN";
                    const statusMessage = latestHistory.status_message || latestHistory.status_message_raw || "";

                    console.log(`[Zerodha Gateway] Order ${placedOrderId} Live Status: ${orderState} - ${statusMessage}`);

                    if (orderState === "REJECTED") {
                      console.warn(`[Zerodha Gateway] Zerodha RMS Rejected Order ${placedOrderId}: ${statusMessage}`);

                      // Auto-recovery 1: If MIS was rejected on options, retry immediately with NRML
                      if (
                        effectiveProduct === "MIS" &&
                        (statusMessage.toLowerCase().includes("mis") ||
                         statusMessage.toLowerCase().includes("option") ||
                         statusMessage.toLowerCase().includes("product"))
                      ) {
                        console.log(`[Zerodha Gateway] MIS blocked for options. Retrying Order with NRML product type...`);
                        effectiveProduct = "NRML";
                        const nrmlRetry = await safeKiteFetch("https://api.kite.trade/orders/regular", {
                          method: "POST",
                          headers: {
                            "X-Kite-Version": "3",
                            "Authorization": `token ${apiKey}:${accessToken}`,
                            "Content-Type": "application/x-www-form-urlencoded"
                          },
                          body: buildParams(effectiveOrderType, roundedPrice, defaultTickSize)
                        });
                        const nrmlData = nrmlRetry.data;
                        console.log(`[Zerodha Gateway] NRML Retry Response:`, JSON.stringify(nrmlData));
                        if (nrmlData.status === "success" && nrmlData.data && nrmlData.data.order_id) {
                          executedOrderIds.push(nrmlData.data.order_id);
                          primaryTradingSymbol = candidate;
                          sliceExecuted = true;
                          break;
                        }
                      }

                      // Auto-recovery 2: If price band / circuit limit rejection, retry with marketable limit
                      if (
                        statusMessage.toLowerCase().includes("price") ||
                        statusMessage.toLowerCase().includes("band") ||
                        statusMessage.toLowerCase().includes("circuit") ||
                        statusMessage.toLowerCase().includes("execution range")
                      ) {
                        const newProtectedPrice = transaction_type === "BUY"
                          ? roundToTick(roundedPrice * 1.03, defaultTickSize)
                          : Math.max(defaultTickSize, roundToTick(roundedPrice * 0.97, defaultTickSize));
                        console.log(`[Zerodha Gateway] Price band rejection. Retrying with adjusted limit price ₹${newProtectedPrice}...`);
                        const priceRetry = await safeKiteFetch("https://api.kite.trade/orders/regular", {
                          method: "POST",
                          headers: {
                            "X-Kite-Version": "3",
                            "Authorization": `token ${apiKey}:${accessToken}`,
                            "Content-Type": "application/x-www-form-urlencoded"
                          },
                          body: buildParams("LIMIT", newProtectedPrice, defaultTickSize)
                        });
                        const priceRetryData = priceRetry.data;
                        if (priceRetryData.status === "success" && priceRetryData.data && priceRetryData.data.order_id) {
                          executedOrderIds.push(priceRetryData.data.order_id);
                          primaryTradingSymbol = candidate;
                          sliceExecuted = true;
                          break;
                        }
                      }

                      lastErrorMsg = `Zerodha RMS Rejected: ${statusMessage}`;
                      continue;
                    }
                  }
                }
              } catch (verifyErr: any) {
                console.warn(`[Zerodha Gateway] Status verification check failed:`, verifyErr.message);
              }

              executedOrderIds.push(placedOrderId);
              primaryTradingSymbol = candidate;
              sliceExecuted = true;
              break;
            } else {
              lastErrorMsg = kiteData.message || "Order placement failed";
              
              const isIpBlocked =
                kiteData.error_type === "PermissionException" ||
                (kiteData.message &&
                  (kiteData.message.includes("is not allowed to place orders") ||
                   kiteData.message.includes("not allowed for this app") ||
                   (kiteData.message.includes("IP") && kiteData.message.includes("not allowed"))));

              const isFatalAccountIssue =
                isIpBlocked ||
                (kiteData.message &&
                  (
                    kiteData.message.toLowerCase().includes("insufficient") ||
                    kiteData.message.toLowerCase().includes("funds") ||
                    kiteData.message.toLowerCase().includes("margin") ||
                    kiteData.message.toLowerCase().includes("balance") ||
                    kiteData.message.toLowerCase().includes("session") ||
                    kiteData.message.toLowerCase().includes("token") ||
                    kiteData.message.toLowerCase().includes("disabled") ||
                    kiteData.message.toLowerCase().includes("blocked")
                  ));

              if (isIpBlocked) {
                console.error(`[Zerodha Gateway] IP Whitelist Rejection from Kite: ${kiteData.message}`);
                return res.status(403).json({
                  success: false,
                  errorType: "PermissionException",
                  isIpBlocked: true,
                  message: kiteData.message || "IP is not allowed to place orders for this app. Please update allowed IPs on developers.kite.trade."
                });
              }

              if (isFatalAccountIssue) {
                break;
              }
              continue;
            }
          }

          if (!sliceExecuted && executedOrderIds.length === 0) {
            return res.status(400).json({
              success: false,
              errorType: "ZerodhaOrderError",
              message: lastErrorMsg || "Zerodha order placement failed. Verify account margin and session."
            });
          }
        }

        const primaryOrderId = executedOrderIds[0] || `ord-${Date.now()}`;
        return res.json({
          success: true,
          orderId: primaryOrderId,
          orderIds: executedOrderIds,
          status: "COMPLETE",
          tradingsymbol: primaryTradingSymbol,
          transactionType: transaction_type,
          quantity: effectiveTotalQty,
          lotSize: contractLotSize,
          tickSize: defaultTickSize,
          price: roundedPrice,
          orderTypeExecuted: effectiveOrderType,
          isSliced: isAutoSliced,
          sliceCount: qtySlices.length,
          freezeLimitApplied: freezeLimit,
          slippageProtectedPrice: slippageProtectedPrice,
          message: isAutoSliced
            ? `Order executed in ${qtySlices.length} exchange-compliant freeze slices (${qtySlices.join(', ')} Qty). Order IDs: ${executedOrderIds.join(', ')}`
            : `Order submitted to Zerodha. Order ID: ${primaryOrderId}`
        });
      } else {
        return res.status(400).json({
          success: false,
          errorType: "NoZerodhaSession",
          message: "Zerodha Session Disconnected. Please click 'LOG IN WITH ZERODHA KITE' to authorize your session."
        });
      }
    } catch (err: any) {
      console.error("[Zerodha Gateway] Order execution error:", err);
      return res.status(500).json({
        success: false,
        errorType: "InternalServerError",
        message: err.message || "Failed to route order to Zerodha Kite."
      });
    }
  });

  // Diagnostic Endpoint: Check resolution of any instrument
  app.get("/api/zerodha/resolve-instrument", (req, res) => {
    const symbol = (req.query.symbol as string) || "";
    const exchange = (req.query.exchange as string) || "";
    const resolved = resolveZerodhaInstrument(symbol, exchange);
    const status = getInstrumentsStatus();
    res.json({
      query: { symbol, exchange },
      resolved,
      masterStatus: status
    });
  });

  // 2.2 Fetch Live Zerodha Positions Endpoint
  app.post("/api/zerodha/positions", async (req, res) => {
    try {
      const apiKey = req.body?.apiKey || (req.query.apiKey as string) || "";
      const accessToken = req.body?.accessToken || (req.query.accessToken as string) || "";

      if (!apiKey || !accessToken) {
        return res.status(400).json({
          success: false,
          message: "Zerodha session credentials required. Please authenticate."
        });
      }

      console.log("[Zerodha Gateway] Querying live positions from Kite API...");
      const { ok, status, data } = await safeKiteFetch("https://api.kite.trade/portfolio/positions", {
        method: "GET",
        headers: {
          "X-Kite-Version": "3",
          "Authorization": `token ${apiKey}:${accessToken}`
        }
      });

      console.log(`[Zerodha Gateway] Kite Positions Response (${status})`);

      if (data.status === "success" && data.data) {
        return res.json({
          success: true,
          net: data.data.net || [],
          day: data.data.day || []
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data.message || "Failed to fetch positions from Zerodha Kite."
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to communicate with Zerodha Kite Portfolio API"
      });
    }
  });

  // 2.3 Fetch Live Zerodha Order Book Endpoint
  app.post("/api/zerodha/orders", async (req, res) => {
    try {
      const apiKey = req.body?.apiKey || (req.query.apiKey as string) || "";
      const accessToken = req.body?.accessToken || (req.query.accessToken as string) || "";

      if (!apiKey || !accessToken) {
        return res.status(400).json({
          success: false,
          message: "Zerodha session credentials required."
        });
      }

      console.log("[Zerodha Gateway] Querying live order book from Kite API...");
      const { ok, status, data } = await safeKiteFetch("https://api.kite.trade/orders", {
        method: "GET",
        headers: {
          "X-Kite-Version": "3",
          "Authorization": `token ${apiKey}:${accessToken}`
        }
      });

      if (data.status === "success" && Array.isArray(data.data)) {
        return res.json({
          success: true,
          orders: data.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data.message || "Failed to fetch order book from Zerodha Kite."
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to communicate with Zerodha Kite Orders API"
      });
    }
  });

  // 2.4 Zerodha Historical Candle Data Endpoint (1m, 5m, 15m, 60m, day)
  app.post("/api/zerodha/historical", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const { apiKey, accessToken, symbol, interval = "5minute", days = 2 } = req.body;
      if (!apiKey || !accessToken) {
        return res.status(400).json({
          success: false,
          source: 'UNAVAILABLE',
          message: "Zerodha session required for historical candles."
        });
      }

      // Resolve token
      let token = "";
      const resolved = resolveZerodhaInstrument(symbol || "NIFTY 50", "NSE") || resolveZerodhaInstrument(symbol || "NIFTY 50", "NFO");
      if (resolved) {
        token = resolved.token;
      } else if (symbol === "NIFTY 50" || symbol === "NIFTY") {
        token = "256265"; // NSE:NIFTY 50 token
      } else if (symbol === "NIFTY BANK" || symbol === "BANKNIFTY") {
        token = "260105"; // NSE:NIFTY BANK token
      } else if (symbol === "FINNIFTY") {
        token = "257801"; // NSE:FINNIFTY token
      }

      if (!token) {
        return res.status(400).json({
          success: false,
          source: 'UNAVAILABLE',
          message: `Unable to resolve instrument token for ${symbol}`
        });
      }

      const toDate = new Date();
      const fromDate = new Date(Date.now() - (Number(days) || 2) * 24 * 3600 * 1000);
      const toStr = toDate.toISOString().slice(0, 10);
      const fromStr = fromDate.toISOString().slice(0, 10);

      const url = `https://api.kite.trade/instruments/historical/${token}/${interval}?from=${fromStr}&to=${toStr}`;
      const { ok, data } = await safeKiteFetch(url, {
        method: "GET",
        headers: {
          "X-Kite-Version": "3",
          "Authorization": `token ${apiKey}:${accessToken}`
        }
      });

      if (ok && data?.status === "success" && Array.isArray(data?.data?.candles)) {
        const parsedCandles = data.data.candles.map((c: any[]) => ({
          time: new Date(c[0]).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
          timestamp: new Date(c[0]).getTime(),
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
          volume: c[5]
        }));

        return res.json({
          success: true,
          source: 'ZERODHA_KITE_LIVE',
          candles: parsedCandles
        });
      } else {
        return res.status(400).json({
          success: false,
          source: 'UNAVAILABLE',
          message: data?.message || "Failed to fetch historical candles from Kite API."
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        source: 'UNAVAILABLE',
        message: err.message || "Historical candle fetch failed."
      });
    }
  });

  // 2.5 Zerodha Live Quotes & Spot Index Endpoint (Strictly Live Data Only)
  const quotesHandler = async (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const apiKey = req.body?.apiKey || (req.query.apiKey as string) || "";
      const accessToken = req.body?.accessToken || (req.query.accessToken as string) || "";
      const instrumentsParam = req.body?.instruments || req.query.instruments;
      const instruments = Array.isArray(instrumentsParam)
        ? instrumentsParam
        : typeof instrumentsParam === 'string'
        ? instrumentsParam.split(',')
        : [];

      // If active Zerodha key & access token are available, query Zerodha Kite Live Quote API
      if (apiKey && accessToken) {
        try {
          const rawList = Array.isArray(instruments) && instruments.length > 0
            ? instruments
            : [
                'NFO:NIFTY26AUG24650CE',
                'NFO:NIFTY26AUG24600CE',
                'NFO:NIFTY26AUG24550CE',
                'NFO:NIFTY26AUG24500CE',
                'NFO:NIFTY26AUG24500PE',
                'NFO:NIFTY26AUG24550PE',
                'NFO:NIFTY26AUG24600PE',
                'NFO:NIFTY26AUG24650PE',
                'NFO:BANKNIFTY26AUG52000CE',
                'NFO:BANKNIFTY26AUG51800PE',
                'NFO:FINNIFTY26AUG23500CE',
                'NSE:RELIANCE',
                'NSE:HDFCBANK',
                'NSE:ICICIBANK',
                'NSE:INFY',
                'NSE:TCS',
                'NSE:SBIN'
              ];

          // Always include Spot Indices & VIX in live quote request for real Black-Scholes & regime calculations
          const spotIndicesToFetch = [
            'NSE:NIFTY 50',
            'NSE:NIFTY BANK',
            'NSE:NIFTY FIN SERVICE',
            'BSE:SENSEX',
            'NSE:INDIA VIX'
          ];

          const kiteQueryTokens = new Set<string>(spotIndicesToFetch);
          const symbolAliases = new Map<string, string[]>(); // kiteKey -> displaySymbols

          for (const item of rawList) {
            const clean = item.trim();
            if (!clean) continue;

            if (clean.includes(':')) {
              kiteQueryTokens.add(clean);
              const symOnly = clean.split(':')[1];
              const list = symbolAliases.get(clean) || [];
              list.push(symOnly, clean);
              symbolAliases.set(clean, list);
            } else {
              const resolved = resolveZerodhaInstrument(clean, 'NFO') || resolveZerodhaInstrument(clean, 'NSE');
              if (resolved) {
                const kiteKey = `${resolved.exchange}:${resolved.tradingsymbol}`;
                kiteQueryTokens.add(kiteKey);
                const list = symbolAliases.get(kiteKey) || [];
                list.push(clean, resolved.tradingsymbol, `${resolved.exchange}:${resolved.tradingsymbol}`);
                symbolAliases.set(kiteKey, list);
              } else {
                const fallbackKey = clean.includes('NIFTY') ? `NFO:${clean.replace(/\s+/g, '')}` : `NSE:${clean}`;
                kiteQueryTokens.add(fallbackKey);
                const list = symbolAliases.get(fallbackKey) || [];
                list.push(clean);
                symbolAliases.set(fallbackKey, list);
              }
            }
          }

          const params = new URLSearchParams();
          Array.from(kiteQueryTokens).slice(0, 50).forEach((t) => params.append('i', t));

          const { ok, status, data } = await safeKiteFetch(`https://api.kite.trade/quote?${params.toString()}`, {
            method: 'GET',
            headers: {
              'X-Kite-Version': '3',
              'Authorization': `token ${apiKey}:${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
          });

          if (ok && data && data.status === 'success' && data.data) {
            const fetchedQuotes: Record<string, any> = {};
            const spotIndices: Record<string, number> = {};

            for (const [instKey, item] of Object.entries<any>(data.data)) {
              const symbolOnly = instKey.split(':')[1] || instKey;
              const lastPrice = item.last_price || item.ohlc?.close || 0;
              const close = item.ohlc?.close || lastPrice;
              const netChange = +(lastPrice - close).toFixed(2);
              const changePct = close ? +((netChange / close) * 100).toFixed(2) : 0;

              const quoteObj = {
                lastPrice,
                netChange,
                changePct,
                high: item.ohlc?.high || lastPrice,
                low: item.ohlc?.low || lastPrice,
                close,
                open: item.ohlc?.open || lastPrice,
                volume: item.volume || 0,
                oi: item.oi || 0,
                depth: item.depth || null,
                timestampMs: Date.now()
              };

              fetchedQuotes[symbolOnly] = quoteObj;
              fetchedQuotes[instKey] = quoteObj;

              if (instKey === 'NSE:NIFTY 50' || symbolOnly === 'NIFTY 50') spotIndices['NIFTY 50'] = lastPrice;
              if (instKey === 'NSE:NIFTY BANK' || symbolOnly === 'NIFTY BANK') spotIndices['NIFTY BANK'] = lastPrice;
              if (instKey === 'NSE:NIFTY FIN SERVICE' || symbolOnly === 'NIFTY FIN SERVICE') spotIndices['FINNIFTY'] = lastPrice;
              if (instKey === 'BSE:SENSEX' || symbolOnly === 'SENSEX') spotIndices['SENSEX'] = lastPrice;
              if (instKey === 'NSE:INDIA VIX' || symbolOnly === 'INDIA VIX') spotIndices['INDIA VIX'] = lastPrice;

              const aliases = symbolAliases.get(instKey) || [];
              for (const alias of aliases) {
                fetchedQuotes[alias] = quoteObj;
              }
            }

            console.log(`[Zerodha Gateway] Live Quotes fetched directly from Kite (${Object.keys(fetchedQuotes).length} symbols, Spot Nifty: ₹${spotIndices['NIFTY 50'] || 'N/A'})`);

            return res.json({
              success: true,
              source: 'ZERODHA_KITE_LIVE',
              quotes: fetchedQuotes,
              spotIndices,
              dataTimestampMs: Date.now(),
              timestamp: new Date().toLocaleTimeString(),
              message: 'Live quotes retrieved directly from Zerodha Kite API.'
            });
          } else {
            return res.status(400).json({
              success: false,
              source: 'UNAVAILABLE',
              quotes: {},
              message: data?.message || 'Zerodha Kite quote query failed.'
            });
          }
        } catch (kiteErr: any) {
          console.warn('Zerodha Kite Live Quote fetch failed:', kiteErr.message);
          return res.status(502).json({
            success: false,
            source: 'UNAVAILABLE',
            quotes: {},
            message: `Kite Live Quote fetch failed: ${kiteErr.message}`
          });
        }
      }

      // No Live Credentials Provided: Return strict UNAVAILABLE response
      // NO FAKE OR RANDOM QUOTES ALLOWED (P0 Requirement)
      return res.json({
        success: false,
        source: 'DISCONNECTED',
        quotes: {},
        dataTimestampMs: 0,
        timestamp: new Date().toLocaleTimeString(),
        message: 'Zerodha Kite not connected. Please log in with Kite credentials to stream live quotes.'
      });
    } catch (err: any) {
      console.error('Error in quotes handler:', err);
      return res.status(500).json({
        success: false,
        source: 'UNAVAILABLE',
        quotes: {},
        message: `Quote handler error: ${err.message}`
      });
    }
  };

  app.get("/api/zerodha/quotes", quotesHandler);
  app.post("/api/zerodha/quotes", quotesHandler);
  app.get("/api/quotes", quotesHandler);
  app.post("/api/quotes", quotesHandler);

  // 3. Optional AI Plain-English Signal Explanation Endpoint (Gemini Powered)
  // Strictly explains ALREADY CALCULATED quant signals; NEVER invents prices, win rates, or orders.
  app.post("/api/ai/explain-signal", async (req, res) => {
    try {
      const { signal } = req.body;
      if (!signal || !signal.symbol) {
        return res.status(400).json({ success: false, message: "Signal object required." });
      }

      const prompt = `You are a quantitative trading desk assistant. Write a concise, 1-2 sentence professional analytical summary of why this mathematically calculated trade was flagged:
Symbol: ${signal.symbol} (${signal.category})
Direction: ${signal.direction}
Entry Price: ₹${signal.entryPrice}, Target: ₹${signal.targetPrice}, Stop Loss: ₹${signal.stopLossPrice}
Win Probability: ${signal.winProbabilityPct}%
Expected Value: ₹${signal.likelihoodCalculation?.expectedValueINR ?? 'N/A'}
Delta: ${signal.greeks?.delta ?? 'N/A'}, Relative Theta Decay: ${signal.greeks?.thetaDecayPctPerDay ?? 0}%/day
Indicator Confluence: ${(signal.indicatorConfluence || []).join(', ')}
Bad Trade Warning: ${signal.isBadTradeWarning ? 'YES (' + signal.badTradeReason + ')' : 'NO'}
Must Take Flag: ${signal.isMustTakeTrade ? 'YES (' + signal.mustTakeReason + ')' : 'NO'}

Output ONLY the concise 1-2 sentence explanation. Do not change any numbers or recommend different prices.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const explanation = response.text?.trim() || signal.laymanReason || "Mathematically evaluated setup.";
      return res.json({
        success: true,
        explanation
      });
    } catch (err: any) {
      return res.json({
        success: false,
        explanation: req.body?.signal?.laymanReason || "Evaluated via Black-Scholes Delta and technical indicators."
      });
    }
  });

  // Vite middleware for development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GoldenGate Terminal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

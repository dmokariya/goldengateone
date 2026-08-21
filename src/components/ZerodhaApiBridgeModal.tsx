import React, { useState } from 'react';
import { ZerodhaApiCredentials } from '../types';
import { Key, CheckCircle, Copy, ExternalLink, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';

interface ZerodhaApiBridgeProps {
  creds: ZerodhaApiCredentials;
  onUpdateCreds: (newCreds: ZerodhaApiCredentials) => void;
  onDisconnect?: () => void;
}

export const ZerodhaApiBridge: React.FC<ZerodhaApiBridgeProps> = ({ creds, onUpdateCreds, onDisconnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSaveCredentials = () => {
    localStorage.setItem('zerodha_api_key', creds.apiKey || '');
    localStorage.setItem('zerodha_api_secret', creds.apiSecret || '');
    setStatusMessage({ text: 'API Credentials saved locally!', isError: false });
  };

  const handleLaunchKiteLogin = () => {
    const key = creds.apiKey?.trim();
    if (!key) {
      setStatusMessage({
        text: 'Please enter your Zerodha API Key from developers.kite.trade first.',
        isError: true
      });
      return;
    }

    // Save key & secret to localStorage so auto-capture works when Zerodha redirects back
    localStorage.setItem('zerodha_api_key', key);
    if (creds.apiSecret) {
      localStorage.setItem('zerodha_api_secret', creds.apiSecret.trim());
    }

    const kiteUrl = `https://kite.trade/connect/login?v=3&api_key=${encodeURIComponent(key)}`;
    window.open(kiteUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/zerodha/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          requestToken: creds.requestToken
        })
      });

      const data = await res.json();

      if (data.success) {
        const newCreds: ZerodhaApiCredentials = {
          ...creds,
          isConnected: true,
          accessToken: data.accessToken,
          userLoginId: data.userLoginId,
          brokerageAccount: data.brokerageAccount,
          simulatedPingMs: Math.floor(Math.random() * 30) + 110
        };

        localStorage.setItem('zerodha_access_token', data.accessToken);
        localStorage.setItem('zerodha_user_id', data.userLoginId);
        localStorage.setItem('zerodha_is_connected', 'true');

        onUpdateCreds(newCreds);
        setStatusMessage({ text: 'Successfully authenticated with Zerodha Kite!', isError: false });
      } else {
        setStatusMessage({ text: data.message || 'Zerodha session token exchange failed.', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Connection error: ${err.message || 'Failed to reach backend'}`, isError: true });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs text-[#D1D5DB]">
      {/* Header Status Card */}
      <div className={`p-6 rounded-sm border ${creds.isConnected ? 'bg-[#0A2E1F]/40 border-[#10B981]/50' : 'bg-[#111827] border-[#1F2937]'} flex flex-col md:flex-row items-center justify-between gap-4`}>
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded flex items-center justify-center ${creds.isConnected ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/10 text-red-400'}`}>
            {creds.isConnected ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                {creds.isConnected ? 'Zerodha Kite Session Active' : 'Zerodha Disconnected'}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${creds.isConnected ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                {creds.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {creds.isConnected
                ? `Logged in as User ID: ${creds.userLoginId || 'ZERODHA_USER'} | Brokerage: ${creds.brokerageAccount}`
                : 'Enter your Zerodha API credentials below to connect your trading account.'}
            </p>
          </div>
        </div>

        {creds.isConnected && onDisconnect && (
          <button
            onClick={onDisconnect}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-4 py-2 rounded font-bold transition-all"
          >
            DISCONNECT SESSION
          </button>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <h3 className="font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Key className="w-4 h-4 text-[#3B82F6]" />
            <span>Zerodha API Key & Secret</span>
          </h3>
          <a
            href="https://developers.kite.trade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>Get API Keys on developers.kite.trade</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 uppercase text-[10px] block mb-1 font-bold flex items-center justify-between">
              <span>API Key (app_key)</span>
              {creds.apiKey && <span className="text-emerald-400 text-[9px]">✓ Saved</span>}
            </label>
            <input
              type="text"
              value={creds.apiKey}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateCreds({ ...creds, apiKey: val });
                localStorage.setItem('zerodha_api_key', val);
              }}
              placeholder="e.g. 7x09q144z4v32r0y"
              className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-gray-400 uppercase text-[10px] block mb-1 font-bold flex items-center justify-between">
              <span>API Secret</span>
              {creds.apiSecret && <span className="text-emerald-400 text-[9px]">✓ Saved</span>}
            </label>
            <input
              type="password"
              value={creds.apiSecret}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateCreds({ ...creds, apiSecret: val });
                localStorage.setItem('zerodha_api_secret', val);
              }}
              placeholder="e.g. your_api_secret_hash"
              className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-gray-400 uppercase text-[10px] block mb-1 font-bold flex items-center justify-between">
              <span>Access Token (Daily)</span>
              {creds.accessToken ? <span className="text-emerald-400 text-[9px]">✓ Active</span> : <span className="text-amber-400 text-[9px]">Paste or login</span>}
            </label>
            <input
              type="password"
              value={creds.accessToken || ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateCreds({ ...creds, accessToken: val, isConnected: Boolean(creds.apiKey && val) });
                localStorage.setItem('zerodha_access_token', val);
                localStorage.setItem('zerodha_is_connected', val ? 'true' : 'false');
              }}
              placeholder="Paste active access_token"
              className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
            />
          </div>
        </div>

        {/* Request Token Input Row */}
        <div className="bg-[#0A0B0E] p-3 rounded border border-gray-800">
          <label className="text-gray-400 uppercase text-[10px] block mb-1 font-bold">
            Request Token (From Kite OAuth redirect url: <span className="text-blue-400">?request_token=...</span>)
          </label>
          <input
            type="text"
            value={creds.requestToken || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateCreds({ ...creds, requestToken: val });
            }}
            placeholder="e.g. 5x8s8x82... paste here if not auto-exchanged"
            className="w-full bg-[#111827] border border-[#1F2937] text-white px-3 py-2 rounded focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
          />
        </div>

        <div>
          <label className="text-gray-400 uppercase text-[10px] block mb-1">Redirect URL (Set in Zerodha Developer Portal)</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={window.location.origin}
              className="w-full bg-[#050608] border border-[#1F2937] text-[#10B981] font-bold px-3 py-2 rounded select-all"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin);
                setStatusMessage({ text: 'Redirect URL copied to clipboard!', isError: false });
              }}
              className="px-3 py-2 bg-[#1F2937] hover:bg-[#374151] text-white text-[10px] font-bold rounded flex items-center space-x-1 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>COPY URL</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col md:flex-row gap-3">
          <button
            onClick={handleLaunchKiteLogin}
            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-bold py-2.5 px-4 rounded transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            <span>LOG IN WITH ZERODHA KITE</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isConnecting || !creds.requestToken}
            className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-bold py-2.5 px-4 rounded transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>{isConnecting ? 'EXCHANGING TOKEN...' : 'EXCHANGE TOKEN & CONNECT'}</span>
          </button>
        </div>

        {statusMessage && (
          <div className={`p-3 rounded text-[11px] font-mono border ${statusMessage.isError ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]'}`}>
            {statusMessage.text}
          </div>
        )}
      </div>
    </div>
  );
};

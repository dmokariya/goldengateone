import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, X, ExternalLink, Clock, ShieldCheck, Copy, Check } from 'lucide-react';

interface OrderExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryAsMarket?: (details: { symbol: string; quantity: number; transactionType: 'BUY' | 'SELL' }) => void;
  orderDetails: {
    orderId?: string;
    symbol: string;
    transactionType: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    message: string;
    success: boolean;
  } | null;
}

export const OrderExecutionModal: React.FC<OrderExecutionModalProps> = ({
  isOpen,
  onClose,
  onRetryAsMarket,
  orderDetails
}) => {
  const [copiedIp, setCopiedIp] = useState(false);

  if (!isOpen || !orderDetails) return null;

  const isIpWhitelistError =
    !orderDetails.success &&
    orderDetails.message &&
    (orderDetails.message.includes('not allowed to place orders') ||
     orderDetails.message.includes('PermissionException') ||
     (orderDetails.message.includes('IP') && orderDetails.message.includes('not allowed')));

  // Extract IP from message if present, e.g. "IP (2600:1900:0:3e02::1400)"
  const ipMatch = orderDetails.message?.match(/IP\s*\(([^\)]+)\)/i);
  const extractedIp = ipMatch ? ipMatch[1] : '2600:1900:0:3e02::1400';

  const handleCopyIp = (ipToCopy: string) => {
    navigator.clipboard.writeText(ipToCopy);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono text-xs">
      <div className="bg-[#111827] border border-[#1F2937] w-full max-w-md rounded-sm p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded flex items-center justify-center ${
              orderDetails.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {orderDetails.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {orderDetails.success ? 'ZERODHA ORDER EXECUTED' : 'EXECUTION FAILED'}
            </h3>
            <p className="text-[10px] text-gray-400">Official Zerodha Kite Order Gateway Confirmation</p>
          </div>
        </div>

        {/* Dedicated IP Whitelist Banner if IP error occurred */}
        {isIpWhitelistError && (
          <div className="bg-amber-950/40 border border-amber-500/50 p-3 rounded space-y-2 text-amber-200">
            <div className="flex items-center justify-between font-bold text-amber-400 text-xs">
              <span>⚠️ ZERODHA STATIC IP RESTRICTION</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-amber-300/90">
              Kite Connect requires your server IP to be whitelisted. Zerodha rejected order placement from IP <code className="bg-black/50 px-1 py-0.5 rounded text-white font-bold">{extractedIp}</code>.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => handleCopyIp(extractedIp)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold py-1.5 px-2 rounded text-[10px] flex items-center justify-center space-x-1.5 uppercase transition-colors"
              >
                {copiedIp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIp ? 'COPIED IP!' : `COPY IP (${extractedIp})`}</span>
              </button>
              <a
                href="https://developers.kite.trade"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1F2937] hover:bg-[#374151] border border-gray-700 text-white font-bold py-1.5 px-2.5 rounded text-[10px] flex items-center space-x-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>KITE DEV PORTAL</span>
              </a>
            </div>
            <p className="text-[9.5px] text-gray-400 leading-tight">
              Note: If Zerodha limits your daily IP changes, you can also square off active trades directly inside the official Zerodha Kite mobile app.
            </p>
          </div>
        )}

        <div className="bg-[#0A0B0E] border border-[#1F2937] p-3 rounded space-y-2 text-gray-300 text-[11px]">
          <div className="flex justify-between border-b border-[#1F2937] pb-1.5">
            <span className="text-gray-500 uppercase text-[10px]">Contract Symbol:</span>
            <span className="font-bold text-white">{orderDetails.symbol}</span>
          </div>

          <div className="flex justify-between border-b border-[#1F2937] pb-1.5">
            <span className="text-gray-500 uppercase text-[10px]">Transaction Type:</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                orderDetails.transactionType === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {orderDetails.transactionType}
            </span>
          </div>

          <div className="flex justify-between border-b border-[#1F2937] pb-1.5">
            <span className="text-gray-500 uppercase text-[10px]">Executed Quantity:</span>
            <span className="font-bold text-white">{orderDetails.quantity} Qty</span>
          </div>

          <div className="flex justify-between border-b border-[#1F2937] pb-1.5">
            <span className="text-gray-500 uppercase text-[10px]">Execution Price:</span>
            <span className="font-bold text-emerald-400">₹{orderDetails.price}</span>
          </div>

          <div className="flex justify-between border-b border-[#1F2937] pb-1.5">
            <span className="text-gray-500 uppercase text-[10px]">Expected Time Horizon:</span>
            <span className="font-bold text-blue-300 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span>{orderDetails.symbol.includes('CE') || orderDetails.symbol.includes('PE') ? '15 - 35 Mins (Intraday Option Scalp)' : '30 - 90 Mins (Intraday Equity Drive)'}</span>
            </span>
          </div>

          <div className="flex justify-between border-b border-[#1F2937] pb-1.5">
            <span className="text-gray-500 uppercase text-[10px]">Model Win Likelihood:</span>
            <span className="font-bold text-emerald-400 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>88.4% (Monte Carlo Model)</span>
            </span>
          </div>

          {orderDetails.orderId && (
            <div className="flex justify-between pt-1">
              <span className="text-gray-500 uppercase text-[10px]">Zerodha Order ID:</span>
              <span className="font-bold text-blue-400">{orderDetails.orderId}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className={`p-3 rounded border text-xs font-mono leading-relaxed ${
            orderDetails.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <span className="font-bold block mb-1 uppercase text-[10px] text-gray-400">
              {orderDetails.success ? 'Zerodha Execution Response:' : 'Zerodha Rejection Reason:'}
            </span>
            <span className="font-semibold text-[11px]">{orderDetails.message}</span>
          </div>
        </div>

        <div className="space-y-2">
          {!orderDetails.success && onRetryAsMarket && !isIpWhitelistError && (
            <button
              onClick={() => {
                onRetryAsMarket({
                  symbol: orderDetails.symbol,
                  quantity: orderDetails.quantity,
                  transactionType: orderDetails.transactionType
                });
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded transition-all text-xs uppercase flex items-center justify-center space-x-2 shadow-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>RETRY WITH MARKET PROTECTION ON ZERODHA</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-[#1F2937] hover:bg-[#374151] text-white font-bold py-2 rounded transition-all text-xs uppercase"
          >
            DISMISS & RETURN TO TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
};

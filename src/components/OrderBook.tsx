import React from 'react';
import { OrderBookDepth } from '../types';
import { ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface OrderBookProps {
  orderBook: OrderBookDepth;
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  symbols: string[];
  onSelectPrice: (price: number, side: 'BUY' | 'SELL') => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  orderBook,
  selectedSymbol,
  onSelectSymbol,
  symbols,
  onSelectPrice
}) => {
  const asks = orderBook?.asks || [];
  const bids = orderBook?.bids || [];
  const lastTradedPrice = orderBook?.lastTradedPrice ?? 0;
  const change24h = orderBook?.change24h ?? 0;
  const changePct = orderBook?.changePct ?? 0;
  const spreadBps = orderBook?.spreadBps ?? 0;

  const totalBidQty = bids.reduce((acc, item) => acc + item.quantity, 0);
  const totalAskQty = asks.reduce((acc, item) => acc + item.quantity, 0);
  const totalVolume = totalBidQty + totalAskQty || 1;
  const buyerPct = totalBidQty + totalAskQty > 0 ? Math.round((totalBidQty / totalVolume) * 100) : 50;
  const sellerPct = 100 - buyerPct;

  return (
    <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col h-full rounded-sm relative">
      {/* Header & Symbol Selector */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
          <h3 className="text-[11px] uppercase tracking-widest text-gray-300 font-semibold font-mono">
            Order Book Depth (L2)
          </h3>
        </div>

        <select
          value={selectedSymbol}
          onChange={(e) => onSelectSymbol(e.target.value)}
          className="bg-[#0A0B0E] border border-[#1F2937] text-white text-[11px] font-mono px-2 py-1 rounded focus:outline-none focus:border-[#3B82F6] cursor-pointer"
        >
          {symbols.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>
      </div>

      {/* Top Ticker Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-[#0A0B0E] p-2 border border-[#1F2937] font-mono text-[10px]">
        <div>
          <span className="text-gray-400 block">LAST PRICE</span>
          <span className="text-white font-bold text-sm">
            ₹{lastTradedPrice.toFixed(2)}
          </span>
        </div>
        <div className="text-end">
          <span className="text-gray-400 block">24H CHANGE</span>
          <span className={`font-bold flex items-center justify-end ${change24h >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change24h > 0 ? '+' : ''}{change24h.toFixed(2)} ({changePct}%)
          </span>
        </div>
      </div>

      {/* Column Titles */}
      <div className="flex justify-between text-[10px] uppercase font-mono text-gray-400 pb-1 px-1 border-b border-[#1F2937]">
        <span>Ask Price (₹)</span>
        <span>Orders / Size</span>
      </div>

      {/* ASKS (SELL ORDERS) - Coral Red */}
      <div className="space-y-1 font-mono text-[11px] my-2 min-h-[70px]">
        {asks.length === 0 ? (
          <div className="text-[#EF4444]/60 text-[10px] text-center py-4 italic">
            No live asks streaming
          </div>
        ) : (
          asks.map((ask, index) => (
            <div
              key={`ask-${index}`}
              onClick={() => onSelectPrice(ask.price, 'BUY')}
              className="flex justify-between items-center text-[#EF4444] cursor-pointer hover:bg-[#EF4444]/10 px-1 py-0.5 rounded transition-colors relative overflow-hidden group"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#EF4444]/15 pointer-events-none transition-all duration-300"
                style={{ width: `${Math.min(100, ask.depthPct)}%` }}
              />
              <span className="font-semibold z-10">{ask.price.toFixed(2)}</span>
              <div className="flex items-center space-x-2 z-10 text-[10px]">
                <span className="text-gray-500 font-sans">({ask.ordersCount})</span>
                <span className="font-bold">{ask.quantity.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MID PRICE ANCHOR / SPREAD */}
      <div className="border-y border-[#374151] py-2 my-2 text-center text-white font-bold bg-[#1F2937]/80 font-mono flex items-center justify-between px-3 text-xs shadow-inner">
        <span className="text-gray-400 text-[10px] font-normal uppercase">Spread: {spreadBps} bps</span>
        <span className="text-white text-sm font-black tracking-wide">{lastTradedPrice.toFixed(2)}</span>
        <span className="text-[#10B981] text-[10px]">REAL FEED</span>
      </div>

      {/* BIDS (BUY ORDERS) - Emerald Green */}
      <div className="space-y-1 font-mono text-[11px] my-2 min-h-[70px]">
        {bids.length === 0 ? (
          <div className="text-[#10B981]/60 text-[10px] text-center py-4 italic">
            No live bids streaming
          </div>
        ) : (
          bids.map((bid, index) => (
            <div
              key={`bid-${index}`}
              onClick={() => onSelectPrice(bid.price, 'SELL')}
              className="flex justify-between items-center text-[#10B981] cursor-pointer hover:bg-[#10B981]/10 px-1 py-0.5 rounded transition-colors relative overflow-hidden group"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#10B981]/15 pointer-events-none transition-all duration-300"
                style={{ width: `${Math.min(100, bid.depthPct)}%` }}
              />
              <span className="font-semibold z-10">{bid.price.toFixed(2)}</span>
              <div className="flex items-center space-x-2 z-10 text-[10px]">
                <span className="text-gray-500 font-sans">({bid.ordersCount})</span>
                <span className="font-bold">{bid.quantity.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* BUY/SELL PRESSURE IMBALANCE BAR */}
      <div className="mt-auto pt-3 border-t border-[#1F2937]">
        <div className="flex justify-between text-[10px] font-mono mb-1">
          <span className="text-[#10B981] font-bold">BUYERS {buyerPct}%</span>
          <span className="text-gray-400">Orderflow Imbalance</span>
          <span className="text-[#EF4444] font-bold">SELLERS {sellerPct}%</span>
        </div>
        <div className="h-2 w-full bg-[#EF4444] rounded-full overflow-hidden flex">
          <div
            className="bg-[#10B981] h-full transition-all duration-500"
            style={{ width: `${buyerPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

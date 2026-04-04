'use client';
import React, { useEffect, useRef } from 'react';

export default function TradingViewWidget({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Direct embed approach for better reliability
    const cleanSymbol = symbol.toUpperCase();
    let tvSymbol = `NSE:${cleanSymbol}`;
    if (cleanSymbol === 'NIFTY') tvSymbol = "NSE:NIFTY";
    else if (cleanSymbol === 'BANKNIFTY') tvSymbol = "NSE:BANKNIFTY";
    else if (cleanSymbol === 'FINNIFTY') tvSymbol = "NSE:FINNIFTY";
    else if (cleanSymbol === 'MIDCPNIFTY') tvSymbol = "NSE:MIDCPNIFTY";
    else if (cleanSymbol === 'M&M') tvSymbol = "NSE:M_M";
    else if (cleanSymbol === 'BAJAJ-AUTO') tvSymbol = "NSE:BAJAJ_AUTO";

    container.current.innerHTML = '';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": tvSymbol,
      "interval": "5",
      "timezone": "Asia/Kolkata",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "studies": [
        "STD;EMA"
      ],
      "container_id": "tradingview_advanced_chart"
    });

    const widgetDiv = document.createElement("div");
    widgetDiv.id = "tradingview_advanced_chart";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    
    container.current.appendChild(widgetDiv);
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container h-full w-full bg-[#050608]" ref={container}>
    </div>
  );
}
import React, { useState, useEffect } from 'react';

const TELEMETRY_LINES = [
  "SYSTEM: INITIALIZING CLOUD INSTANCE...",
  "STATUS: DETECTING EXTRACTION ENGINES... ONLINE",
  "MODULE: SCANNING TARGETS... [HTTP/HTTPS NODE LAYER]",
  ">> SCRAPPER-SOUL PROXY ROUTING DEPLOYED SYNC.",
  ">> DATA ACQUISITION FLOW METRICS VERIFIED.",
  "CORE: RUNNING ENTERPRISE WEB INTELLIGENCE PORTAL.",
  "READY: STANDING BY FOR OPERATOR ACCESS REQ..."
];

export default function TerminalPanel() {
  const [visibleLines, setVisibleLines] = useState([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [textBuffer, setTextBuffer] = useState('');

  useEffect(() => {
    if (currentLineIdx >= TELEMETRY_LINES.length) return;

    const fullText = TELEMETRY_LINES[currentLineIdx];
    let charIdx = 0;

    const interval = setInterval(() => {
      const nextChar = fullText.charAt(charIdx);
      setTextBuffer((prev) => prev + nextChar);
      charIdx++;

      if (charIdx >= fullText.length) {
        clearInterval(interval);
        
        setTimeout(() => {
          setVisibleLines((prev) => [...prev, fullText]);
          setTextBuffer('');
          setCurrentLineIdx((prev) => prev + 1);
        }, 400);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [currentLineIdx]);

  return (
    <div className="hidden lg:flex lg:w-1/2 bg-[#070b10] border-r border-slate-800 p-12 flex-col justify-between relative scanline-effect select-none font-mono">
      {/* Absolute floating grid texture backlayer */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Header Matrix Status Bar */}
      <div className="flex justify-between items-center z-10 border-b border-slate-900 pb-4">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500/40"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500/40"></span>
          <span className="w-3 h-3 rounded-full bg-green-500/40"></span>
          <span className="text-xs text-slate-500 pl-2">soul_kernel_v2.4.0.sh</span>
        </div>
        <div className="text-[11px] text-blue-500/70 bg-blue-950/20 px-2 py-0.5 rounded border border-blue-900/30">
          SECURE SHELL CONNECTION
        </div>
      </div>

      {/* Main Terminal Screen Content Area */}
      <div className="flex-1 my-12 space-y-2 text-sm text-slate-400 z-10 overflow-hidden custom-scrollbar">
        {visibleLines.map((line, idx) => (
          <p 
            key={idx} 
            className={
              line.startsWith('>>') 
                ? 'text-blue-400' 
                : line.startsWith('STATUS') 
                  ? 'text-emerald-400' 
                  : 'text-slate-300'
            }
          >
            {line}
          </p>
        ))}
        {currentLineIdx < TELEMETRY_LINES.length && (
          <p className="terminal-cursor inline-block text-slate-300">
            {textBuffer}
          </p>
        )}
      </div>

      {/* Footer Branding Feature Block */}
      <div className="z-10 border-t border-slate-900 pt-6 space-y-2">
        <div className="text-xs text-slate-500 font-sans font-medium uppercase tracking-widest">
          Platform Architecture Overview
        </div>
        <p className="text-sm text-slate-400 font-sans leading-relaxed">
          Scrapper-Soul is a modular distributed data mining console tailored for harvesting secure enterprise structures with instant cookie handshake relays.
        </p>
      </div>
    </div>
  );
}
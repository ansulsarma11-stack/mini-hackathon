import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DetectedFaceMatch } from '../types';
import { UserCheck, AlertTriangle, HelpCircle, Eye, Scan, Sparkles, Crosshair } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  imageUrl: string;
  matches: DetectedFaceMatch[];
  selectedFaceId: string | null;
  onSelectFace: (face: DetectedFaceMatch | null) => void;
  isScanning?: boolean;
}

export const ClassroomCanvas: React.FC<Props> = ({
  imageUrl,
  matches,
  selectedFaceId,
  onSelectFace,
  isScanning = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, scannerHudActive, setScannerHudActive } = useTheme();
  const [showLaserBeam, setShowLaserBeam] = useState<boolean>(true);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border shadow-2xl select-none transition-colors duration-300 ${theme.cardClass}`}
    >
      {/* Top HUD Toolbar */}
      <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
            <Scan className="w-3.5 h-3.5 animate-pulse" />
            OPTICAL SCANNER V3.2
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-slate-400 font-mono">
            TARGETS: {matches.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLaserBeam(!showLaserBeam)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition flex items-center gap-1 ${
              showLaserBeam
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Laser Sweep: {showLaserBeam ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setScannerHudActive(!scannerHudActive)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition flex items-center gap-1 ${
              scannerHudActive
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            HUD Grid: {scannerHudActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div className="relative w-full flex items-center justify-center bg-black/80 p-2 sm:p-4 overflow-hidden">
        {/* Tightly wrapped image container */}
        <div className="relative inline-block max-w-full">
          <img
            src={imageUrl}
            alt="Classroom Scene"
            className="block max-h-[580px] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />

          {/* Animated Laser Scanning Beam */}
          {(showLaserBeam || isScanning) && (
            <motion.div
              initial={{ top: '0%' }}
              animate={{ top: ['0%', '98%', '0%'] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute left-0 right-0 h-1 pointer-events-none z-30"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.primaryColor}, #38bdf8, transparent)`,
                boxShadow: `0 0 15px ${theme.primaryColor}, 0 0 30px #38bdf8`,
              }}
            >
              {/* Vertical laser trail gradient */}
              <div
                className="absolute left-0 right-0 h-16 -top-16 opacity-30 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${theme.primaryColor}, transparent)`,
                }}
              />
            </motion.div>
          )}

          {/* Holographic HUD Grid overlay */}
          {scannerHudActive && (
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:32px_32px] rounded-xl" />
          )}

          {/* Overlay Bounding Boxes */}
          <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
              {matches.map((det, index) => {
                const { box, matchType, confidence, studentName, boxId } = det;
                const topPct = (box.ymin / 1000) * 100;
                const leftPct = (box.xmin / 1000) * 100;
                const widthPct = ((box.xmax - box.xmin) / 1000) * 100;
                const heightPct = ((box.ymax - box.ymin) / 1000) * 100;

                const isSelected = selectedFaceId === boxId;

                // Color coding
                let borderColor = 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.4)]';
                let badgeBg = 'bg-emerald-600 text-white';
                let Icon = UserCheck;

                if (matchType === 'uncertain') {
                  borderColor = 'border-amber-400 bg-amber-500/15 shadow-[0_0_18px_rgba(245,158,11,0.4)]';
                  badgeBg = 'bg-amber-600 text-white';
                  Icon = AlertTriangle;
                } else if (matchType === 'unknown') {
                  borderColor = 'border-rose-500 bg-rose-500/20 shadow-[0_0_24px_rgba(244,63,94,0.6)]';
                  badgeBg = 'bg-rose-600 text-white animate-pulse';
                  Icon = HelpCircle;
                }

                return (
                  <motion.div
                    key={boxId}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{
                      delay: index * 0.08,
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                    onClick={() => onSelectFace(isSelected ? null : det)}
                    style={{
                      top: `${topPct}%`,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                    className={`absolute pointer-events-auto cursor-pointer border-2 transition-all duration-200 rounded-lg group ${borderColor} ${
                      isSelected
                        ? 'ring-4 ring-white scale-[1.04] z-40'
                        : 'hover:scale-[1.02] z-20'
                    }`}
                  >
                    {/* Animated HUD corner reticles */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-sm pointer-events-none shadow-sm" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-sm pointer-events-none shadow-sm" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-sm pointer-events-none shadow-sm" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-sm pointer-events-none shadow-sm" />

                    {/* Reticle center point in HUD mode */}
                    {scannerHudActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}

                    {/* Floating identity badge */}
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className={`absolute -top-7 left-0 transform whitespace-nowrap px-2.5 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xl ${badgeBg}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono text-[11px]">
                        {matchType === 'unknown' ? 'UNKNOWN' : studentName}
                      </span>
                      <span className="opacity-90 font-mono text-[10px]">
                        {Math.round(confidence * 100)}%
                      </span>
                    </motion.div>

                    {/* Pulsing ring for Unknown Faces */}
                    {matchType === 'unknown' && (
                      <div className="absolute -inset-2 rounded-xl border border-rose-500/40 animate-ping pointer-events-none" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Canvas footer toolbar */}
      <div className="px-4 py-2.5 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]" />
            <span className="font-mono text-emerald-400">Recognized ({matches.filter((m) => m.matchType === 'recognized').length})</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-[0_0_8px_#f59e0b]" />
            <span className="font-mono text-amber-400">Uncertain ({matches.filter((m) => m.matchType === 'uncertain').length})</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_10px_#f43f5e] animate-pulse" />
            <span className="font-mono text-rose-400">Unknown ({matches.filter((m) => m.matchType === 'unknown').length})</span>
          </span>
        </div>
        <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click any face box to inspect biometric landmarks & distance reasoning</span>
        </div>
      </div>
    </div>
  );
};

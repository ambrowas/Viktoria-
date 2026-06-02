import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import type { Show } from "@/types";
import { resolveMediaUrl } from "@/utils/media";

interface EndingPreviewProps {
  show: Show;
  mode: "winner" | "credits";
  revealPhase: number;
  isInteractive?: boolean;
  onAdvanceRevealPhase?: () => void;
  onSetMode?: (mode: "winner" | "credits") => void;
  onClose?: () => void;
  isInline?: boolean;
}

export const EndingPreview: React.FC<EndingPreviewProps> = ({
  show,
  mode,
  revealPhase,
  isInteractive = false,
  onAdvanceRevealPhase,
  onSetMode,
  onClose,
  isInline = false,
}) => {
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Confetti Loop Effect (Winner Screen, Phase 2 only)
  useEffect(() => {
    if (mode === "winner" && revealPhase === 2) {
      const duration = 4000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [mode, revealPhase]);

  // Audio Playback Effect
  useEffect(() => {
    if (isInline) return; // Do not play audio in inline/tab mode
    const musicKey = show.settings.introMusic || "viktoria";
    const relativePath = musicKey === "show_don_start" ? "sounds/Show_Don_Start.mp3" : "sounds/Viktoria_Game_On_.mp3";
    const resolvedPath = resolveMediaUrl(relativePath);
    
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(resolvedPath);
      previewAudioRef.current.loop = true;
      previewAudioRef.current.volume = 0.5;
    }
    
    previewAudioRef.current.play().catch(err => {
      console.warn("EndingPreview theme music failed to play:", err);
    });

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [show.settings.introMusic, isInline]);

  const handleScreenClick = (e: React.MouseEvent) => {
    if (!isInteractive) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (onAdvanceRevealPhase) {
      onAdvanceRevealPhase();
    }
  };

  return (
    <div className={isInline ? "w-full h-full flex flex-col overflow-hidden select-none font-sans bg-transparent" : "fixed inset-0 z-[1000] bg-black text-white flex flex-col overflow-hidden select-none font-sans"}>
      {/* Close button top right - Host/Single screen only */}
      {isInteractive && onClose && (
        <div className="absolute top-4 right-4 z-[1100]">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-full text-sm shadow-md transition-all transform hover:scale-105 active:scale-95"
          >
            Exit Preview ✕
          </button>
        </div>
      )}

      {mode === "winner" ? (
        // Phase 1: Winner Screen
        <div 
          onClick={handleScreenClick}
          className={`relative flex-1 flex flex-col justify-center items-center p-8 text-center bg-gradient-to-b from-[#110e05] via-[#050401] to-black ${isInteractive ? "cursor-pointer" : ""}`}
        >
          {/* Radial gradient spotlight and background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(253,224,71,0.12)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />

          <AnimatePresence mode="wait">
            {revealPhase === 0 && (
              <motion.div
                key="preview-phase-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center w-full max-w-5xl"
              >
                <h2 className="text-2xl font-black tracking-[0.4em] text-yellow-500 uppercase mb-8 drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                  {show.settings.language === "es" ? "POSICIONES DE BRONCE (VISTA PREVIA)" : "BRONZE STANDINGS (PREVIEW)"}
                </h2>
                
                <div className="flex gap-8 justify-center items-end mt-4 flex-wrap">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 w-80 text-center shadow-xl backdrop-blur-sm">
                    <div className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-2">4th Place</div>
                    <div className="text-2xl font-black mb-4 uppercase truncate text-slate-400">
                      {show.teams[3]?.name || "Fourth Team"}
                    </div>
                    <div className="text-xl font-bold text-yellow-500 mb-6">600 pts</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Members</div>
                    <div className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
                       {(show.teams[3]?.players || [{ id: '1', name: 'Player A' }]).map((p: any) => <span key={p.id} className="truncate">{p.name}</span>)}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700/80 rounded-3xl p-8 w-80 text-center shadow-xl relative backdrop-blur-sm">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-600/20 border border-yellow-600/40 text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                       PODIUM
                    </div>
                    <div className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2">3rd Place</div>
                    <div className="text-2xl font-black mb-4 uppercase truncate text-slate-300">
                      {show.teams[2]?.name || "Third Team"}
                    </div>
                    <div className="text-xl font-bold text-yellow-500 mb-6">900 pts</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Members</div>
                    <div className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
                       {(show.teams[2]?.players || [{ id: '2', name: 'Player B' }]).map((p: any) => <span key={p.id} className="truncate">{p.name}</span>)}
                    </div>
                  </div>
                </div>

                {isInteractive && (
                  <p className="text-yellow-500/60 text-xs uppercase tracking-[0.25em] font-black mt-16 animate-pulse">
                    {show.settings.language === "es" ? "CLICK EN LA PANTALLA PARA REVELAR EL SUBCAMPEÓN ➔" : "CLICK ANYWHERE TO REVEAL RUNNER UP ➔"}
                  </p>
                )}
              </motion.div>
            )}

            {revealPhase === 1 && (
              <motion.div
                key="preview-phase-1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center w-full max-w-5xl"
              >
                <h2 className="text-2xl font-black tracking-[0.4em] text-yellow-500 uppercase mb-8 drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                  {show.settings.language === "es" ? "SUBCAMPEÓN DEL SHOW (VISTA PREVIA)" : "SHOW RUNNER UP (PREVIEW)"}
                </h2>

                <div className="flex justify-center mt-4">
                  <div className="bg-slate-900/60 border border-slate-600 rounded-3xl p-10 w-96 text-center shadow-2xl relative backdrop-blur-sm">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-700 border border-slate-500 text-white text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1 rounded-full shadow-lg">
                       2ND PLACE
                    </div>
                    <div className="text-4xl font-black mb-6 uppercase tracking-tight truncate text-slate-300">
                      {show.teams[1]?.name || "Second Team"}
                    </div>
                    <div className="text-2xl font-extrabold text-yellow-500 mb-8">1,200 pts</div>
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] mb-3">Members</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(show.teams[1]?.players || [{ id: '3', name: 'Player C' }]).map((p: any) => (
                        <span key={p.id} className="text-sm font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {isInteractive && (
                  <p className="text-yellow-500/60 text-xs uppercase tracking-[0.25em] font-black mt-16 animate-pulse">
                    {show.settings.language === "es" ? "CLICK EN LA PANTALLA PARA REVELAR EL CAMPEÓN Y EL TROFEO ➔" : "CLICK ANYWHERE TO REVEAL WINNER & TROPHY ➔"}
                  </p>
                )}
              </motion.div>
            )}

            {revealPhase === 2 && (
              <motion.div
                key="preview-phase-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center w-full"
              >
                <h2 className="text-2xl font-black tracking-[0.4em] text-yellow-500 uppercase mb-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                  {show.settings.winnerTitle ||
                    (show.settings.language === "es" ? "CAMPEÓN DEL SHOW" : "SHOW CHAMPION")}
                </h2>

                <h1
                  className="text-6xl md:text-8xl font-black mb-8 uppercase tracking-tighter truncate max-w-4xl"
                  style={{
                    color: show.teams[0]?.color || "#fbbf24",
                    textShadow: `0 0 40px ${show.teams[0]?.color || "#fbbf24"}40`
                  }}
                >
                  {show.teams[0]?.name || "Winner Team"}
                </h1>

                <motion.div
                  initial={{ scale: 0, rotate: -20, y: 0 }}
                  animate={{ 
                    scale: 1,
                    rotate: 0,
                  }}
                  transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.3 }}
                  className="relative mb-10 z-10"
                >
                  <motion.div
                    animate={{ 
                      y: [0, -15, 0],
                      scale: [1, 1.03, 1]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 4, 
                      ease: "easeInOut" 
                    }}
                    className="relative"
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 rounded-full blur-[80px] animate-pulse pointer-events-none -z-10" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-dashed border-yellow-500/25 rounded-full animate-[spin_40s_linear_infinite] pointer-events-none -z-10" />

                    <img
                      src={resolveMediaUrl("images/ADTC_Trophy.png")}
                      alt="ADTC Trophy"
                      className="w-80 h-80 md:w-96 md:h-96 object-contain drop-shadow-[0_15px_60px_rgba(253,224,71,0.6)]"
                    />
                  </motion.div>
                </motion.div>

                {/* Score calculation */}
                <div className="bg-yellow-500/5 border border-yellow-500/20 backdrop-blur-md rounded-3xl p-6 max-w-sm w-full mb-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                  <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.25em] mb-3">
                    {show.settings.language === "es" ? "CÁLCULO DEL PUNTAJE FINAL" : "FINAL SCORE CALCULATION"}
                  </h3>
                  <div className="flex flex-col gap-1.5 font-bold text-xs text-slate-300 text-left">
                    <div className="flex justify-between items-center px-1">
                      <span>{show.settings.language === "es" ? "Puntaje Acumulado:" : "Accumulated Score:"}</span>
                      <span className="text-white">1,200 pts</span>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span>{show.settings.language === "es" ? "Puntaje de Cara a Cara:" : "Face Off Guesses:"}</span>
                      <span className="text-white">+ 400 pts</span>
                    </div>
                    <div className="h-[1px] bg-slate-800 my-1" />
                    <div className="flex justify-between items-center px-1 text-lg font-black text-yellow-400">
                      <span>{show.settings.language === "es" ? "PUNTAJE FINAL:" : "FINAL SCORE:"}</span>
                      <span className="drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">1,600 pts</span>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="flex flex-col gap-2 mb-8">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                    {show.settings.language === "es" ? "INTEGRANTES" : "MEMBERS"}
                  </span>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {(show.teams[0]?.players || [{ id: '4', name: 'Player D' }]).map((p: any) => (
                      <span
                        key={p.id}
                        className="text-base font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-4 py-1 rounded-full backdrop-blur-sm shadow-md text-white"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                {isInteractive && onSetMode && (
                  <button
                    onClick={() => onSetMode("credits")}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-10 py-3.5 rounded-full text-xl shadow-[0_0_35px_rgba(250,204,21,0.5)] transition transform hover:scale-105 active:scale-95 animate-pulse mt-4"
                  >
                    {show.settings.language === "es" ? "VER CRÉDITOS ➔" : "CONTINUE TO CREDITS ➔"}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        // Phase 2: Cinematic Credits Scroll
        <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900 to-black text-white relative">
          {isInteractive && onSetMode && (
            <header className="flex justify-between items-center p-4 border-b border-white/10 z-20">
              <button
                onClick={() => onSetMode("winner")}
                className="text-sm font-bold text-slate-400 hover:text-white"
              >
                ← Winner Screen
              </button>
              <div className="flex items-center gap-4 font-bold text-xs text-slate-400 uppercase tracking-widest">
                <span>Ending Credits Preview</span>
              </div>
              <div className="w-20" />
            </header>
          )}

          <main className="flex-1 flex flex-col items-center justify-start overflow-hidden relative">
            <style>{`
              @keyframes scrollCredits {
                0% {
                  transform: translateY(60vh);
                }
                100% {
                  transform: translateY(-110%);
                }
              }
              .credits-scroll-element {
                animation: scrollCredits 45s linear forwards;
              }
            `}</style>

            <div className="credits-scroll-element flex flex-col items-center text-center max-w-xl px-6 py-10 gap-12 select-none pointer-events-none">
              <div>
                <h1 className="text-4xl font-black tracking-widest text-yellow-500 uppercase mb-3 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                  {show.name || "Untitled Show"}
                </h1>
                <p className="text-base text-slate-400 font-bold uppercase tracking-widest">
                  {show.settings.language === "es" ? "La Gran Final" : "The Grand Finale"}
                </p>
              </div>

              <div className="w-12 h-[1px] bg-yellow-500/30" />

              {/* Organizers Section */}
              <div className="flex flex-col gap-4">
                <h2 className="text-[10px] font-black tracking-[0.4em] text-yellow-500/50 uppercase">
                  {show.settings.language === "es" ? "Organizadores" : "Organizers"}
                </h2>
                {(show.settings.organizers || []).map((org, index) => (
                  <div key={index} className="flex flex-col gap-0.5 mt-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{org.role}</span>
                    {org.name.split(/[,;]/).map(n => n.trim()).filter(Boolean).map((n, i) => (
                      <span key={i} className="text-xl font-black text-white uppercase tracking-wider">{n}</span>
                    ))}
                  </div>
                ))}
              </div>

              <div className="w-12 h-[1px] bg-yellow-500/30" />

              {/* Teams / Contestants Section */}
              <div className="flex flex-col gap-6">
                <h2 className="text-[10px] font-black tracking-[0.4em] text-yellow-500/50 uppercase">
                  {show.settings.language === "es" ? "Participantes e Integrantes" : "Participants & Contestants"}
                </h2>
                {show.teams.map((team, idx) => (
                  <div key={team.id || idx} className="flex flex-col gap-2">
                    <span className="text-base font-black uppercase tracking-widest" style={{ color: team.color || "#e2e8f0" }}>
                      {team.name}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {(team.players || []).map((p: any) => (
                        <span key={p.id} className="text-xl font-bold text-white uppercase tracking-wider">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-12 h-[1px] bg-yellow-500/30" />

              {/* Outro thank you message */}
              <div className="pt-10 pb-20">
                <h2 className="text-3xl font-black tracking-widest text-yellow-500 uppercase drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] animate-pulse">
                  {show.settings.thankYouMessage ||
                    (show.settings.language === "es" ? "¡GRACIAS POR JUGAR!" : "THANK YOU FOR PLAYING!")}
                </h2>
                <p className="text-slate-500 text-[10px] mt-3 uppercase tracking-[0.3em] font-bold">
                  © {new Date().getFullYear()} Viktoria Productions. All Rights Reserved.
                </p>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

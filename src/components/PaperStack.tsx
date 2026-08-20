import { useEffect, useRef, useState, useCallback } from 'react';
import { animate, createTimeline, set, Timeline } from 'animejs';
import { FileText, ShieldCheck } from 'lucide-react';
import { DOCUMENTS } from '../constants/mockData';

// Helper to calculate 3D transformation matrices per stack layer depth (0 = top, 4 = bottom)
const getLayerTransform = (depth: number) => ({
  translateY: depth * 14,
  translateX: depth * 6,
  translateZ: -depth * 36,
  rotateZ: depth === 0 ? 0 : (depth % 2 === 1 ? -1.8 * depth : 1.5 * depth),
  rotateX: 12 + depth * 1.2,
  rotateY: -16 - depth * 1.5,
  scale: 1 - depth * 0.035,
  opacity: Math.max(0.4, 1 - depth * 0.14),
});

export default function PaperStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackWrapperRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Maintain the virtual order of cards (indices 0..4)
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3, 4]);
  const isShufflingRef = useRef(false);
  const animeTimelineRef = useRef<Timeline | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);

  // 1. Autonomous Page Shuffle Loop (Self-running, No Controls)
  const triggerShuffle = useCallback(() => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;

    setOrder((prevOrder) => {
      const currentCards = cardRefs.current;
      const topCardIndex = prevOrder[0];
      const topCardEl = currentCards[topCardIndex];

      if (!topCardEl) {
        isShufflingRef.current = false;
        return prevOrder;
      }

      // Rest of the cards
      const nextOrder = [...prevOrder.slice(1), prevOrder[0]];
      const tl = createTimeline({
        defaults: {
          ease: 'inOutCubic',
        },
        onComplete: () => {
          isShufflingRef.current = false;
        },
      });

      animeTimelineRef.current = tl;

      // Step 1: Top card peels up, elevates, slides out to the right in 3D
      tl.add(topCardEl, {
        translateX: 240,
        translateY: -70,
        translateZ: 140,
        rotateX: 20,
        rotateY: -28,
        rotateZ: 12,
        scale: 1.05,
        duration: 750,
        ease: 'outCubic',
      });

      // Step 2: Concurrently promote remaining cards forward in the stack
      nextOrder.slice(0, 4).forEach((idx, pos) => {
        const cardEl = currentCards[idx];
        if (cardEl) {
          const t = getLayerTransform(pos);
          tl.add(cardEl, {
            translateX: t.translateX,
            translateY: t.translateY,
            translateZ: t.translateZ,
            rotateX: t.rotateX,
            rotateY: t.rotateY,
            rotateZ: t.rotateZ,
            scale: t.scale,
            opacity: t.opacity,
            duration: 650,
            ease: 'inOutQuad',
          }, pos === 0 ? '-=500' : '<');
        }
      });

      // Step 3: Top card glides back and tucks behind the bottom of the stack
      const bottomTransform = getLayerTransform(4);
      tl.add(topCardEl, {
        translateX: bottomTransform.translateX,
        translateY: bottomTransform.translateY,
        translateZ: bottomTransform.translateZ,
        rotateX: bottomTransform.rotateX,
        rotateY: bottomTransform.rotateY,
        rotateZ: bottomTransform.rotateZ,
        scale: bottomTransform.scale,
        opacity: bottomTransform.opacity,
        duration: 700,
        ease: 'inOutCubic',
      }, '-=300');

      // Sync the ground shadow swell
      if (shadowRef.current) {
        animate(shadowRef.current, {
          scale: [1, 1.15, 1],
          opacity: [0.65, 0.45, 0.65],
          duration: 1200,
          ease: 'inOutQuad',
        });
      }

      return nextOrder;
    });
  }, []);

  const startAutonomousShuffle = useCallback(() => {
    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    // Shuffle automatically every 3.8 seconds with no user controls
    shuffleTimerRef.current = window.setInterval(() => {
      triggerShuffle();
    }, 3800);
  }, [triggerShuffle]);

  // 2. Initial Cascade Entrance & Ambient Float Setup
  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
    
    // Set initial 3D transform origin
    cards.forEach((card, idx) => {
      const transform = getLayerTransform(idx);
      set(card, {
        translateX: transform.translateX + 80,
        translateY: transform.translateY - 140,
        translateZ: transform.translateZ + 200,
        rotateX: transform.rotateX - 25,
        rotateY: transform.rotateY + 30,
        rotateZ: transform.rotateZ + 15,
        scale: 0.85,
        opacity: 0,
      });
    });

    if (shadowRef.current) {
      set(shadowRef.current, {
        opacity: 0,
        scale: 0.7,
      });
    }

    // Cascade entrance with anime.js v4
    cards.forEach((card, idx) => {
      const transform = getLayerTransform(idx);
      animate(card, {
        translateX: transform.translateX,
        translateY: transform.translateY,
        translateZ: transform.translateZ,
        rotateX: transform.rotateX,
        rotateY: transform.rotateY,
        rotateZ: transform.rotateZ,
        scale: transform.scale,
        opacity: transform.opacity,
        delay: idx * 120 + 200,
        duration: 1400,
        ease: 'outQuint',
        onComplete: idx === cards.length - 1 ? () => {
          startAutonomousShuffle();
        } : () => {},
      });
    });

    if (shadowRef.current) {
      animate(shadowRef.current, {
        opacity: 0.65,
        scale: 1,
        duration: 1600,
        delay: 300,
        ease: 'outQuad',
      });
    }

    // Ambient floating oscillation (continuous breathing motion)
    let floatAnim: ReturnType<typeof animate> | null = null;
    if (stackWrapperRef.current) {
      floatAnim = animate(stackWrapperRef.current, {
        translateY: ['-6px', '6px'],
        rotateZ: ['-0.5deg', '0.5deg'],
        duration: 3800,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      });
    }

    return () => {
      if (floatAnim) floatAnim.pause();
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    };
  }, [startAutonomousShuffle]);

  // 3. Smooth Mouse Ambient Parallax (Pure CSS/Anime spring responsiveness)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    animate(containerRef.current, {
      rotateY: x * 14,
      rotateX: -y * 12,
      duration: 600,
      ease: 'outQuad',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current) return;
    animate(containerRef.current, {
      rotateY: 0,
      rotateX: 0,
      duration: 1000,
      ease: 'outElastic(1, .7)',
    });
  }, []);

  return (
    <div 
      className="relative w-full max-w-[540px] h-[500px] flex items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1400px' }}
    >
      {/* Dynamic Ground Shadow */}
      <div
        ref={shadowRef}
        className="absolute bottom-6 w-[360px] h-[65px] rounded-full bg-black/35 dark:bg-black/70 blur-2xl pointer-events-none transform -rotate-6 preserve-3d"
      />

      {/* 3D Stack Container */}
      <div
        ref={containerRef}
        className="relative w-[320px] sm:w-[360px] h-[430px] preserve-3d"
      >
        <div 
          ref={stackWrapperRef} 
          className="relative w-full h-full preserve-3d"
        >
          {DOCUMENTS.map((doc, index) => {
            const currentPositionInStack = order.indexOf(index);
            const zIndex = 50 - currentPositionInStack * 10;

            return (
              <div
                key={doc.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                className="absolute inset-0 rounded-2xl bg-white dark:bg-[#181816] text-zinc-900 dark:text-zinc-100 border border-zinc-900/10 dark:border-zinc-100/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col justify-between p-6 overflow-hidden backface-visible preserve-3d cursor-default"
                style={{
                  zIndex,
                  willChange: 'transform, opacity',
                  backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 0)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Paper Top Bar / Header */}
                <div className="flex items-start justify-between border-b border-zinc-900/10 dark:border-zinc-100/10 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                        {doc.type}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                        PAGES 01–{doc.pages.toString().padStart(2, '0')} • {doc.size}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border ${doc.badgeColor} flex items-center gap-1`}>
                    <ShieldCheck className="h-2.5 w-2.5" />
                    {doc.badge}
                  </span>
                </div>

                {/* Paper Body: Render Document Specific Mockup Elements */}
                <div className="flex-1 py-4 flex flex-col justify-between">
                  {/* Document Title Header */}
                  <div>
                    <h3 className="text-xs font-mono font-bold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                      AUTHOR: {doc.author.toUpperCase()} • {doc.date}
                    </p>
                  </div>

                  {/* Document Custom Graphic Body depending on index */}
                  {index === 0 && (
                    <div className="my-2 p-2.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-900/5 dark:border-zinc-100/5 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                        <span>PIPELINE RENDER STATUS</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% COMPILED</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[88%]" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[8.5px] text-zinc-600 dark:text-zinc-300">
                        <div className="p-1 rounded bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
                          MEMORY: <strong className="text-zinc-900 dark:text-zinc-100">42.8 MB</strong>
                        </div>
                        <div className="p-1 rounded bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
                          LAYERS: <strong className="text-zinc-900 dark:text-zinc-100">8 VECTORS</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="my-2 p-2.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-900/5 dark:border-zinc-100/5 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                        <span>AUDIT METRICS</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">BALANCED</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-10 pt-2 px-1">
                        <div className="flex-1 bg-blue-500/20 rounded-t h-[40%]" />
                        <div className="flex-1 bg-blue-500/40 rounded-t h-[65%]" />
                        <div className="flex-1 bg-blue-500/60 rounded-t h-[50%]" />
                        <div className="flex-1 bg-blue-500/80 rounded-t h-[85%]" />
                        <div className="flex-1 bg-blue-500 rounded-t h-[100%]" />
                      </div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="my-2 p-2.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-900/5 dark:border-zinc-100/5 flex flex-col gap-1.5 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>LEGAL JURISDICTION</span>
                        <span className="font-semibold text-rose-500">STRICT PRIVACY</span>
                      </div>
                      <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                        <p className="line-clamp-2 italic text-[8.5px] leading-tight">
                          "All in-memory vectors are executed in zero-telemetry hardware sandbox without external egress."
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-4 w-12 bg-rose-500/20 rounded border border-rose-500/30 flex items-center justify-center text-[7px] text-rose-600 dark:text-rose-400 font-bold">
                          SEALED
                        </div>
                        <span className="text-[8px] text-zinc-400">SIGNATURE ID: 0x9F41E</span>
                      </div>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="my-2 p-2.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-900/5 dark:border-zinc-100/5 flex flex-col gap-1 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>CAD VECTOR GRID</span>
                        <span className="font-semibold text-amber-500">X: 1920 / Y: 1080</span>
                      </div>
                      <div className="h-9 w-full rounded border border-dashed border-amber-500/40 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-amber-500/5" />
                        <div className="h-6 w-6 rounded-full border border-amber-500/60 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {index === 4 && (
                    <div className="my-2 p-2.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-900/5 dark:border-zinc-100/5 flex flex-col gap-1.5 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>TYPOGRAPHY SYSTEM</span>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">GEIST / PLUS JAKARTA</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-5 flex-1 rounded bg-purple-500/20 flex items-center justify-center text-[8px] font-bold text-purple-600 dark:text-purple-300">
                          H1 (24PX)
                        </div>
                        <div className="h-5 flex-1 rounded bg-purple-500/10 flex items-center justify-center text-[8px] text-purple-600 dark:text-purple-300">
                          BODY (13PX)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Simulated Lines */}
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded w-[85%]" />
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded w-[60%]" />
                  </div>
                </div>

                {/* Paper Footer Bar: Barcode, Stamp, Page Number */}
                <div className="border-t border-zinc-900/10 dark:border-zinc-100/10 pt-3 flex items-center justify-between font-mono text-[9px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 h-3 opacity-60">
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[2px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[3px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[2px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                    </div>
                    <span className="text-[8px] tracking-widest uppercase">DOC_{doc.id.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[8.5px] font-semibold text-zinc-600 dark:text-zinc-300">LOCAL VAULT</span>
                  </div>
                </div>

                {/* Subtle paper texture overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/[0.02] via-transparent to-white/[0.04] dark:from-white/[0.01] dark:to-transparent" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

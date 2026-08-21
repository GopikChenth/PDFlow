import React, { useState, useRef, useCallback } from 'react';
import { 
  StickyNote as StickyIcon, 
  Mic as MicIcon, 
  Trash2
} from 'lucide-react';
import { PDFAnnotation, AnnotationToolType } from '../../types';

interface AnnotationLayerProps {
  pageNum: number;
  width: number;
  height: number;
  activeTool: AnnotationToolType;
  activeColor: string;
  strokeWidth: number;
  annotations: PDFAnnotation[];
  onAddAnnotation: (annotation: PDFAnnotation) => void;
  onUpdateAnnotation: (annotation: PDFAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onOpenStickyNote: (annotation: PDFAnnotation) => void;
  onToolUsed?: () => void;
}

export default function AnnotationLayer({
  pageNum,
  width,
  height,
  activeTool,
  activeColor,
  strokeWidth,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onOpenStickyNote,
  onToolUsed,
}: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentDragPoint, setCurrentDragPoint] = useState<{ x: number; y: number } | null>(null);

  // Polygon & Area multi-click points
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Active page annotations
  const pageAnnotations = annotations.filter((a) => a.pageNum === pageNum);

  // Normalized relative coordinate helper (0..1)
  const getRelativeCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      x: Math.max(0, Math.min(1, rawX / rect.width)),
      y: Math.max(0, Math.min(1, rawY / rect.height)),
    };
  }, []);

  // Distance calculation helper (calibrated to standard PDF scale)
  const calculateDistanceCm = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = (p2.x - p1.x) * (width / 72) * 2.54;
    const dy = (p2.y - p1.y) * (height / 72) * 2.54;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return `${dist.toFixed(1)} cm`;
  };

  // Polygon Area calculation (Green's theorem)
  const calculateAreaCm2 = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 3) return '0.0 cm²';
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const x1 = pts[i].x * (width / 72) * 2.54;
      const y1 = pts[i].y * (height / 72) * 2.54;
      const x2 = pts[j].x * (width / 72) * 2.54;
      const y2 = pts[j].y * (height / 72) * 2.54;
      area += x1 * y2 - x2 * y1;
    }
    return `${Math.abs(area / 2).toFixed(1)} cm²`;
  };

  // MOUSE DOWN HANDLER
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'select') return;
    
    // Ignore clicks if originating from existing interactive HTML elements
    const target = e.target as HTMLElement;
    if (target.closest('.interactive-annotation')) return;

    e.preventDefault();
    e.stopPropagation();

    const pt = getRelativeCoords(e);
    isDrawingRef.current = true;
    setStartPoint(pt);
    setCurrentDragPoint(pt);

    if (activeTool === 'pen') {
      setCurrentPoints([pt]);
    } else if (activeTool === 'sticky-note') {
      isDrawingRef.current = false;
      const newAnn: PDFAnnotation = {
        id: `note-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'sticky-note',
        rect: { x: pt.x, y: pt.y, width: 0.05, height: 0.05 },
        color: activeColor,
        text: '',
        comments: [],
        createdAt: new Date(),
      };
      onAddAnnotation(newAnn);
      onOpenStickyNote(newAnn);
      onToolUsed?.();
    } else if (activeTool === 'voice-note') {
      isDrawingRef.current = false;
      const newAnn: PDFAnnotation = {
        id: `voice-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'voice-note',
        rect: { x: pt.x, y: pt.y, width: 0.05, height: 0.05 },
        color: activeColor,
        text: '',
        comments: [],
        createdAt: new Date(),
      };
      onAddAnnotation(newAnn);
      onOpenStickyNote(newAnn);
      onToolUsed?.();
    } else if (activeTool === 'textbox') {
      isDrawingRef.current = false;
      const newAnn: PDFAnnotation = {
        id: `text-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'textbox',
        rect: { x: pt.x, y: pt.y, width: 0.28, height: 0.1 },
        color: activeColor,
        text: '',
        fontSize: 14,
        createdAt: new Date(),
      };
      onAddAnnotation(newAnn);
      onToolUsed?.();
    } else if (activeTool === 'polygon' || activeTool === 'measure-area') {
      // Add polygon vertex
      const newPts = [...polygonPoints, pt];
      setPolygonPoints(newPts);
      if (newPts.length >= 3 && Math.hypot(pt.x - newPts[0].x, pt.y - newPts[0].y) < 0.03) {
        // Closed polygon / area
        const finalPts = newPts.slice(0, -1);
        const areaVal = activeTool === 'measure-area' ? calculateAreaCm2(finalPts) : undefined;
        const finalAnn: PDFAnnotation = {
          id: `poly-${Date.now()}`,
          docId: '',
          pageNum,
          type: activeTool,
          points: finalPts,
          color: activeColor,
          strokeWidth,
          measurementValue: areaVal,
          createdAt: new Date(),
        };
        onAddAnnotation(finalAnn);
        setPolygonPoints([]);
        onToolUsed?.();
      }
    }
  };

  // MOUSE MOVE HANDLER
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    const pt = getRelativeCoords(e);
    setCurrentDragPoint(pt);

    if (activeTool === 'pen') {
      setCurrentPoints((prev) => [...prev, pt]);
    }
  };

  // MOUSE UP HANDLER
  const handleMouseUp = () => {
    if (!isDrawingRef.current || !startPoint || !currentDragPoint) {
      isDrawingRef.current = false;
      return;
    }
    isDrawingRef.current = false;

    const minX = Math.min(startPoint.x, currentDragPoint.x);
    const minY = Math.min(startPoint.y, currentDragPoint.y);
    const w = Math.max(0.01, Math.abs(currentDragPoint.x - startPoint.x));
    const h = Math.max(0.01, Math.abs(currentDragPoint.y - startPoint.y));

    if (activeTool === 'pen' && currentPoints.length > 1) {
      onAddAnnotation({
        id: `pen-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'pen',
        points: currentPoints,
        color: activeColor,
        strokeWidth,
        createdAt: new Date(),
      });
    } else if (activeTool === 'rectangle') {
      onAddAnnotation({
        id: `rect-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'rectangle',
        rect: { x: minX, y: minY, width: w, height: h },
        color: activeColor,
        strokeWidth,
        createdAt: new Date(),
      });
    } else if (activeTool === 'arrow') {
      onAddAnnotation({
        id: `arrow-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'arrow',
        points: [startPoint, currentDragPoint],
        color: activeColor,
        strokeWidth,
        createdAt: new Date(),
      });
    } else if (activeTool === 'line') {
      onAddAnnotation({
        id: `line-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'line',
        points: [startPoint, currentDragPoint],
        color: activeColor,
        strokeWidth,
        createdAt: new Date(),
      });
    } else if (activeTool === 'measure-distance') {
      const dist = calculateDistanceCm(startPoint, currentDragPoint);
      onAddAnnotation({
        id: `dist-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'measure-distance',
        points: [startPoint, currentDragPoint],
        color: activeColor,
        strokeWidth: 2,
        measurementValue: dist,
        createdAt: new Date(),
      });
    } else if (activeTool === 'highlight') {
      onAddAnnotation({
        id: `hl-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'highlight',
        rect: { x: minX, y: minY, width: w, height: h },
        color: activeColor,
        opacity: 0.45,
        createdAt: new Date(),
      });
    } else if (activeTool === 'underline') {
      onAddAnnotation({
        id: `un-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'underline',
        rect: { x: minX, y: minY, width: w, height: h },
        color: activeColor,
        strokeWidth: 2,
        createdAt: new Date(),
      });
    } else if (activeTool === 'strikeout') {
      onAddAnnotation({
        id: `so-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'strikeout',
        rect: { x: minX, y: minY, width: w, height: h },
        color: activeColor,
        strokeWidth: 2,
        createdAt: new Date(),
      });
    } else if (activeTool === 'squiggly') {
      onAddAnnotation({
        id: `sq-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'squiggly',
        rect: { x: minX, y: minY, width: w, height: h },
        color: activeColor,
        strokeWidth: 2,
        createdAt: new Date(),
      });
    } else if (activeTool === 'callout') {
      onAddAnnotation({
        id: `co-${Date.now()}`,
        docId: '',
        pageNum,
        type: 'callout',
        rect: { x: minX, y: minY, width: Math.max(0.25, w), height: Math.max(0.08, h) },
        calloutTarget: startPoint,
        color: activeColor,
        text: 'Callout note...',
        strokeWidth: 1.5,
        createdAt: new Date(),
      });
    }

    setCurrentPoints([]);
    setStartPoint(null);
    setCurrentDragPoint(null);
  };

  // Convert normalized points array to SVG path data string
  const pointsToPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x * width} ${pt.y * height}`, '');
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    className={`absolute inset-0 w-full h-full z-20 ${
      activeTool !== 'select' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none cursor-default'
    }`}
      style={{ touchAction: 'none' }}
    >
      {/* SVG Canvas Layer for Drawings, Shapes, Markups */}
      <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
        <defs>
          <marker
            id={`arrow-head-${pageNum}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={activeColor} />
          </marker>
        </defs>

        {/* Existing Rendered Annotations */}
        {pageAnnotations.map((ann) => {
          if (ann.type === 'pen' && ann.points) {
            return (
              <path
                key={ann.id}
                d={pointsToPath(ann.points)}
                fill="none"
                stroke={ann.color}
                strokeWidth={ann.strokeWidth || 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={ann.opacity || 1}
              />
            );
          }

          if (ann.type === 'rectangle' && ann.rect) {
            return (
              <rect
                key={ann.id}
                x={ann.rect.x * width}
                y={ann.rect.y * height}
                width={ann.rect.width * width}
                height={ann.rect.height * height}
                fill="none"
                stroke={ann.color}
                strokeWidth={ann.strokeWidth || 2}
                rx="4"
              />
            );
          }

          if (ann.type === 'line' && ann.points && ann.points.length >= 2) {
            return (
              <line
                key={ann.id}
                x1={ann.points[0].x * width}
                y1={ann.points[0].y * height}
                x2={ann.points[1].x * width}
                y2={ann.points[1].y * height}
                stroke={ann.color}
                strokeWidth={ann.strokeWidth || 2}
                strokeLinecap="round"
              />
            );
          }

          if (ann.type === 'arrow' && ann.points && ann.points.length >= 2) {
            return (
              <line
                key={ann.id}
                x1={ann.points[0].x * width}
                y1={ann.points[0].y * height}
                x2={ann.points[1].x * width}
                y2={ann.points[1].y * height}
                stroke={ann.color}
                strokeWidth={ann.strokeWidth || 2}
                strokeLinecap="round"
                markerEnd={`url(#arrow-head-${pageNum})`}
              />
            );
          }

          if ((ann.type === 'polygon' || ann.type === 'measure-area') && ann.points && ann.points.length >= 3) {
            const ptsStr = ann.points.map((p) => `${p.x * width},${p.y * height}`).join(' ');
            const centerPt = ann.points.reduce((acc, p) => ({ x: acc.x + p.x / ann.points!.length, y: acc.y + p.y / ann.points!.length }), { x: 0, y: 0 });

            return (
              <g key={ann.id}>
                <polygon
                  points={ptsStr}
                  fill={`${ann.color}18`}
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth || 2}
                />
                {ann.measurementValue && (
                  <>
                    <rect 
                      x={centerPt.x * width - 30} 
                      y={centerPt.y * height - 10} 
                      width="60" 
                      height="20" 
                      rx="4" 
                      fill="#18181b" 
                      opacity="0.9" 
                    />
                    <text 
                      x={centerPt.x * width} 
                      y={centerPt.y * height + 4} 
                      fill="#ffffff" 
                      fontSize="10" 
                      fontFamily="monospace" 
                      textAnchor="middle" 
                      fontWeight="bold"
                    >
                      {ann.measurementValue}
                    </text>
                  </>
                )}
              </g>
            );
          }

          if (ann.type === 'measure-distance' && ann.points && ann.points.length >= 2) {
            const midX = ((ann.points[0].x + ann.points[1].x) / 2) * width;
            const midY = ((ann.points[0].y + ann.points[1].y) / 2) * height;

            return (
              <g key={ann.id}>
                <line
                  x1={ann.points[0].x * width}
                  y1={ann.points[0].y * height}
                  x2={ann.points[1].x * width}
                  y2={ann.points[1].y * height}
                  stroke={ann.color}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <circle cx={ann.points[0].x * width} cy={ann.points[0].y * height} r="3" fill={ann.color} />
                <circle cx={ann.points[1].x * width} cy={ann.points[1].y * height} r="3" fill={ann.color} />
                <rect x={midX - 28} y={midY - 10} width="56" height="20" rx="4" fill="#18181b" opacity="0.9" />
                <text x={midX} y={midY + 4} fill="#ffffff" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  {ann.measurementValue}
                </text>
              </g>
            );
          }

          if (ann.type === 'highlight' && ann.rect) {
            return (
              <rect
                key={ann.id}
                x={ann.rect.x * width}
                y={ann.rect.y * height}
                width={ann.rect.width * width}
                height={ann.rect.height * height}
                fill={ann.color}
                opacity={ann.opacity || 0.45}
                style={{ mixBlendMode: 'multiply' }}
              />
            );
          }

          if (ann.type === 'underline' && ann.rect) {
            return (
              <line
                key={ann.id}
                x1={ann.rect.x * width}
                y1={(ann.rect.y + ann.rect.height) * height}
                x2={(ann.rect.x + ann.rect.width) * width}
                y2={(ann.rect.y + ann.rect.height) * height}
                stroke={ann.color}
                strokeWidth="2.5"
              />
            );
          }

          if (ann.type === 'strikeout' && ann.rect) {
            return (
              <line
                key={ann.id}
                x1={ann.rect.x * width}
                y1={(ann.rect.y + ann.rect.height / 2) * height}
                x2={(ann.rect.x + ann.rect.width) * width}
                y2={(ann.rect.y + ann.rect.height / 2) * height}
                stroke={ann.color}
                strokeWidth="2"
              />
            );
          }

          if (ann.type === 'squiggly' && ann.rect) {
            const startX = ann.rect.x * width;
            const endX = (ann.rect.x + ann.rect.width) * width;
            const lineY = (ann.rect.y + ann.rect.height) * height;
            let pathStr = `M ${startX} ${lineY}`;
            for (let curr = startX; curr <= endX; curr += 6) {
              pathStr += ` Q ${curr + 3} ${lineY + 3}, ${curr + 6} ${lineY}`;
            }

            return (
              <path
                key={ann.id}
                d={pathStr}
                fill="none"
                stroke={ann.color}
                strokeWidth="2"
              />
            );
          }

          if (ann.type === 'callout' && ann.rect && ann.calloutTarget) {
            return (
              <g key={ann.id}>
                <line
                  x1={ann.calloutTarget.x * width}
                  y1={ann.calloutTarget.y * height}
                  x2={ann.rect.x * width}
                  y2={ann.rect.y * height}
                  stroke={ann.color}
                  strokeWidth="1.5"
                />
                <circle cx={ann.calloutTarget.x * width} cy={ann.calloutTarget.y * height} r="3" fill={ann.color} />
              </g>
            );
          }

          return null;
        })}

        {/* Live Drawing In-Progress Shapes */}
        {isDrawingRef.current && startPoint && currentDragPoint && (
          <>
            {activeTool === 'pen' && (
              <path
                d={pointsToPath(currentPoints)}
                fill="none"
                stroke={activeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {activeTool === 'rectangle' && (
              <rect
                x={Math.min(startPoint.x, currentDragPoint.x) * width}
                y={Math.min(startPoint.y, currentDragPoint.y) * height}
                width={Math.abs(currentDragPoint.x - startPoint.x) * width}
                height={Math.abs(currentDragPoint.y - startPoint.y) * height}
                fill="none"
                stroke={activeColor}
                strokeWidth={strokeWidth}
                rx="4"
              />
            )}
            {activeTool === 'line' && (
              <line
                x1={startPoint.x * width}
                y1={startPoint.y * height}
                x2={currentDragPoint.x * width}
                y2={currentDragPoint.y * height}
                stroke={activeColor}
                strokeWidth={strokeWidth}
              />
            )}
            {activeTool === 'arrow' && (
              <line
                x1={startPoint.x * width}
                y1={startPoint.y * height}
                x2={currentDragPoint.x * width}
                y2={currentDragPoint.y * height}
                stroke={activeColor}
                strokeWidth={strokeWidth}
                markerEnd={`url(#arrow-head-${pageNum})`}
              />
            )}
            {activeTool === 'highlight' && (
              <rect
                x={Math.min(startPoint.x, currentDragPoint.x) * width}
                y={Math.min(startPoint.y, currentDragPoint.y) * height}
                width={Math.abs(currentDragPoint.x - startPoint.x) * width}
                height={Math.abs(currentDragPoint.y - startPoint.y) * height}
                fill={activeColor}
                opacity="0.45"
              />
            )}
          </>
        )}
      </svg>

      {/* HTML Interactive Layer for Sticky Notes, Voice Notes, and Text Boxes */}
      {pageAnnotations.map((ann) => {
        if (ann.type === 'sticky-note' && ann.rect) {
          return (
            <div
              key={ann.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenStickyNote(ann);
              }}
              style={{
                left: `${ann.rect.x * 100}%`,
                top: `${ann.rect.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="interactive-annotation absolute z-20 cursor-pointer group flex items-center justify-center pointer-events-auto"
            >
              <div 
                style={{ backgroundColor: ann.color || '#f59e0b' }}
                className="h-7 w-7 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 active:scale-95 transition-all"
              >
                <StickyIcon className="h-4 w-4" />
              </div>
              {(ann.comments || []).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                  {ann.comments!.length}
                </span>
              )}
            </div>
          );
        }

        if (ann.type === 'voice-note' && ann.rect) {
          return (
            <div
              key={ann.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenStickyNote(ann);
              }}
              style={{
                left: `${ann.rect.x * 100}%`,
                top: `${ann.rect.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="interactive-annotation absolute z-20 cursor-pointer group flex items-center justify-center pointer-events-auto"
            >
              <div className="h-8 w-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 active:scale-95 transition-all">
                <MicIcon className="h-4 w-4" />
              </div>
            </div>
          );
        }

        if (ann.type === 'textbox' && ann.rect) {
          return (
            <div
              key={ann.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                left: `${ann.rect.x * 100}%`,
                top: `${ann.rect.y * 100}%`,
                width: `${ann.rect.width * 100}%`,
              }}
              className="interactive-annotation absolute z-20 pointer-events-auto p-2 rounded-xl border-2 border-accent bg-white dark:bg-zinc-900 shadow-xl flex flex-col group transition-shadow"
            >
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/50 text-[10px] font-mono text-zinc-400">
                <span className="font-semibold text-accent">Text Box</span>
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                  className="text-zinc-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                  title="Delete Text Box"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <textarea
                value={ann.text || ''}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdateAnnotation({ ...ann, text: e.target.value })}
                placeholder="Click here to type text..."
                style={{ fontSize: `${ann.fontSize || 14}px` }}
                className="w-full bg-transparent resize-y focus:outline-none font-sans font-medium text-zinc-900 dark:text-zinc-100 min-h-[42px] placeholder:text-zinc-400 leading-relaxed"
                rows={2}
                autoFocus
              />
            </div>
          );
        }

        if (ann.type === 'callout' && ann.rect) {
          return (
            <div
              key={ann.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                left: `${ann.rect.x * 100}%`,
                top: `${ann.rect.y * 100}%`,
                width: `${ann.rect.width * 100}%`,
              }}
              className="interactive-annotation absolute z-20 pointer-events-auto p-2 rounded-xl border-2 border-accent bg-white dark:bg-zinc-900 shadow-lg flex flex-col group"
            >
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/40 text-[10px] font-mono text-zinc-400">
                <span className="font-semibold text-accent">Callout</span>
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                  className="text-zinc-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <textarea
                value={ann.text || ''}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdateAnnotation({ ...ann, text: e.target.value })}
                placeholder="Type callout text..."
                className="w-full bg-transparent resize-none focus:outline-none text-xs font-semibold text-zinc-900 dark:text-zinc-100 min-h-[36px]"
                rows={2}
              />
            </div>
          );
        }

        return null;
      })}

    </div>
  );
}

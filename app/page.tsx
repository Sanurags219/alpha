'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { 
  Camera, 
  Upload, 
  Pencil, 
  Eraser, 
  Undo, 
  Trash2, 
  Download, 
  Share2, 
  Square,
  Circle as CircleIcon,
  Smile,
  ChevronLeft,
  Info,
  Maximize2,
  Pipette,
  Settings2,
  Check,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type Tool = 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'sticker' | 'eyedropper' | 'text';
type LineDash = 'solid' | 'dashed' | 'dotted';

interface Point {
  x: number;
  y: number;
}

interface Path {
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
  lineDash: LineDash;
  roughness: number;
  rect?: { x: number; y: number; w: number; h: number };
  circle?: { x: number; y: number; r: number };
  sticker?: string;
  text?: string;
}

export default function SnapTool() {
  const [image, setImage] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#FF3B30');
  const [size, setSize] = useState(6);
  const [lineDash, setLineDash] = useState<LineDash>('solid');
  const [roughness, setRoughness] = useState(0);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState('🚀');
  const [activeStickerMenu, setActiveStickerMenu] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SDK Initialization
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // Resize Handling
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [image]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setPaths([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: Path) => {
    ctx.strokeStyle = path.tool === 'eraser' ? '#FFFFFF' : path.color;
    ctx.fillStyle = path.color;
    ctx.lineWidth = path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set line dash
    if (path.lineDash === 'dashed') {
      ctx.setLineDash([path.size * 2, path.size * 2]);
    } else if (path.lineDash === 'dotted') {
      ctx.setLineDash([1, path.size * 2]);
    } else {
      ctx.setLineDash([]);
    }

    const applyRoughness = (val: number) => {
      return val + (Math.random() - 0.5) * path.roughness * 10;
    };

    // Set shadow for 'smoothing' effect
    if (path.roughness < 0.3 && path.tool !== 'eraser' && path.tool !== 'eyedropper') {
      ctx.shadowBlur = path.size / 2;
      ctx.shadowColor = path.color;
    } else {
      ctx.shadowBlur = 0;
    }

    if (path.tool === 'pencil' || path.tool === 'eraser') {
      if (path.points.length < 2) return;
      ctx.beginPath();
      
      if (path.roughness > 0) {
        ctx.moveTo(applyRoughness(path.points[0].x), applyRoughness(path.points[0].y));
        path.points.forEach(p => {
          ctx.lineTo(applyRoughness(p.x), applyRoughness(p.y));
        });
      } else {
        // Smoothing with Quadratic Curves
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length - 2; i++) {
          const xc = (path.points[i].x + path.points[i + 1].x) / 2;
          const yc = (path.points[i].y + path.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, xc, yc);
        }
        // curve through the last two points
        if (path.points.length > 2) {
          ctx.quadraticCurveTo(
            path.points[path.points.length - 2].x,
            path.points[path.points.length - 2].y,
            path.points[path.points.length - 1].x,
            path.points[path.points.length - 1].y
          );
        }
      }
      ctx.stroke();
    } else if (path.tool === 'rectangle' && path.rect) {
      if (path.roughness > 0) {
        // Draw sketchy rectangle
        ctx.beginPath();
        const { x, y, w, h } = path.rect;
        ctx.moveTo(applyRoughness(x), applyRoughness(y));
        ctx.lineTo(applyRoughness(x + w), applyRoughness(y));
        ctx.lineTo(applyRoughness(x + w), applyRoughness(y + h));
        ctx.lineTo(applyRoughness(x), applyRoughness(y + h));
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeRect(path.rect.x, path.rect.y, path.rect.w, path.rect.h);
      }
    } else if (path.tool === 'circle' && path.circle) {
      ctx.beginPath();
      if (path.roughness > 0) {
        // Sketchy circle
        for (let i = 0; i < Math.PI * 2; i += 0.1) {
          const rx = path.circle.x + Math.cos(i) * path.circle.r;
          const ry = path.circle.y + Math.sin(i) * path.circle.r;
          if (i === 0) ctx.moveTo(applyRoughness(rx), applyRoughness(ry));
          else ctx.lineTo(applyRoughness(rx), applyRoughness(ry));
        }
        ctx.closePath();
      } else {
        ctx.arc(path.circle.x, path.circle.y, path.circle.r, 0, Math.PI * 2);
      }
      ctx.stroke();
    } else if (path.tool === 'sticker' && path.sticker) {
      ctx.font = `${path.size * 5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(path.sticker, path.points[0].x, path.points[0].y);
    } else if (path.tool === 'text' && path.text) {
      ctx.font = `bold ${path.size * 3}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(path.text, path.points[0].x, path.points[0].y);
    }
    
    // Reset dash
    ctx.setLineDash([]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas internal resolution for retina/high-DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const render = () => {
      if (image) {
        const img = new Image();
        img.src = image;
        img.onload = () => {
          const scale = Math.min(canvasSize.width / img.width, canvasSize.height / img.height);
          const x = (canvasSize.width - img.width * scale) / 2;
          const y = (canvasSize.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          
          paths.forEach(p => drawPath(ctx, p));
          if (currentPath) drawPath(ctx, currentPath);
        };
      } else {
        paths.forEach(p => drawPath(ctx, p));
        if (currentPath) drawPath(ctx, currentPath);
      }
    };

    render();
  }, [image, paths, currentPath, canvasSize, drawPath]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    
    if (tool === 'eyedropper') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // We need to account for DPR when picking pixels
      const dpr = window.devicePixelRatio || 1;
      const pixel = ctx.getImageData(pos.x * dpr, pos.y * dpr, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
      setColor(hex.toUpperCase());
      setTool('pencil');
      return;
    }

    if (tool === 'sticker') {
      // Stickers are one-click
      return;
    }

    if (tool === 'text') {
      // Text is one-click but we'll show a prompt
      const content = window.prompt('Enter your text:');
      if (content) {
        const textPath: Path = {
          tool: 'text',
          color,
          size,
          lineDash,
          roughness,
          points: [pos],
          text: content
        };
        setPaths([...paths, textPath]);
      }
      return;
    }

    setCurrentPath({
      tool,
      color,
      size,
      lineDash,
      roughness,
      points: [pos],
      rect: tool === 'rectangle' ? { ...pos, w: 0, h: 0 } : undefined,
      circle: tool === 'circle' ? { ...pos, r: 0 } : undefined
    });
  };

  const handleDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!currentPath) return;
    const pos = getPos(e);

    const updated = { ...currentPath };
    if (tool === 'pencil' || tool === 'eraser') {
      updated.points = [...updated.points, pos];
    } else if (tool === 'rectangle') {
      updated.rect = {
        x: updated.points[0].x,
        y: updated.points[0].y,
        w: pos.x - updated.points[0].x,
        h: pos.y - updated.points[0].y
      };
    } else if (tool === 'circle') {
      const dx = pos.x - updated.points[0].x;
      const dy = pos.y - updated.points[0].y;
      updated.circle = {
        x: updated.points[0].x,
        y: updated.points[0].y,
        r: Math.sqrt(dx * dx + dy * dy)
      };
    }
    setCurrentPath(updated);
  };

  const endDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'sticker' && !currentPath) {
      const pos = getPos(e);
      const stickerPath: Path = {
        tool: 'sticker',
        color,
        size: 12, // Base size for stickers
        lineDash: 'solid',
        roughness: 0,
        points: [pos],
        sticker: selectedSticker
      };
      setPaths([...paths, stickerPath]);
    } else if (currentPath) {
      setPaths([...paths, currentPath]);
      setCurrentPath(null);
    }
  };

  const handleUndo = () => {
    setPaths(paths.slice(0, -1));
  };

  const handleClear = () => {
    if (confirm('Clear all annotations?')) {
      setPaths([]);
    }
  };

  const addSticker = (s: string) => {
    setTool('sticker');
    // We'll set a state for the active sticker
    // This is a simplified implementation
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      // Use the direct canvas toDataURL. This avoids 'html2canvas' parsing modern CSS colors (oklab/oklch)
      // and is more efficient since we've drawn everything to the canvas already.
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'snap-' + Date.now() + '.png';
      link.href = url;
      link.click();
      
      // Feedback delay
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Visual background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-red-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 pt-6 flex items-center justify-between">
        {image ? (
          <button 
            onClick={() => setImage(null)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">Cancel</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Snap Tool</h1>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold italic">Annotate everything</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {image && (
            <button 
              onClick={handleUndo}
              disabled={paths.length === 0}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all disabled:opacity-20"
            >
              <Undo className="w-5 h-5" />
            </button>
          )}
          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
            <Info className="w-5 h-5 text-white/40" />
          </button>
        </div>
      </header>

      {/* Drawing Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl mb-6">
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                      <Upload className="w-10 h-10 text-white/20" />
                    </div>
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-4 border-[#050505]"
                    >
                      <span className="text-sm">✨</span>
                    </motion.div>
                  </div>
                </div>
                
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold mb-2">Ready to edit?</h2>
                  <p className="text-white/40 text-sm">Bring your screenshots to life with quick annotations and stickers.</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <Upload className="w-5 h-5" />
                    Choose File
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  
                  <button className="relative w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 border border-white/10 transition-all">
                    <Camera className="w-5 h-5" />
                    Take Photo
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" capture="environment" onChange={handleImageUpload} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <button 
                    key={i}
                    onClick={() => setImage(`https://picsum.photos/seed/${i + 10}/800/800`)}
                    className="aspect-square bg-white/5 rounded-2xl border border-white/10 overflow-hidden group relative"
                  >
                    <img 
                      src={`https://picsum.photos/seed/${i + 10}/200/200`} 
                      alt={`Sample ${i}`}
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" 
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">Try Sample</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col items-center"
            >
              <div 
                ref={containerRef}
                className="relative flex-1 w-full bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={handleDrawing}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={handleDrawing}
                  onTouchEnd={endDrawing}
                />
                
                {/* Floating Preview of Line Weight */}
                <div className="absolute top-4 left-4 p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                  <div 
                    className="rounded-full bg-white" 
                    style={{ width: size, height: size, backgroundColor: color }} 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Editor Controls */}
      <AnimatePresence>
        {image && (
          <motion.footer 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="relative z-20 pb-8 px-6"
          >
            <div className="max-w-md mx-auto space-y-4">
              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="p-6 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[32px] shadow-2xl mb-4"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white/40">Brush Settings</h3>
                        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full">
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                      </div>

                      {/* Line Width */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-3">
                          <span>Width</span>
                          <span className="text-white/60">{size}px</span>
                        </div>
                        <input 
                          type="range" min="1" max="50" value={size} 
                          onChange={(e) => setSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Line Dash */}
                      <div>
                        <div className="text-xs font-semibold mb-3 uppercase tracking-tighter text-white/40">Style</div>
                        <div className="flex gap-2">
                          {(['solid', 'dashed', 'dotted'] as LineDash[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setLineDash(s)}
                              className={cn(
                                "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                lineDash === s ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Roughness */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-3">
                          <span>Roughness</span>
                          <span className="text-white/60">{Math.round(roughness * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.1" value={roughness} 
                          onChange={(e) => setRoughness(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tool Selection */}
              <div className="flex items-center justify-between bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 pr-6">
                <div className="flex gap-1">
                  {[
                    { id: 'pencil', icon: Pencil },
                    { id: 'eraser', icon: Eraser },
                    { id: 'rectangle', icon: Square },
                    { id: 'circle', icon: CircleIcon },
                    { id: 'text', icon: Type },
                    { id: 'sticker', icon: Smile },
                    { id: 'eyedropper', icon: Pipette },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTool(t.id as Tool);
                        if (t.id === 'sticker') setActiveStickerMenu(!activeStickerMenu);
                        else setActiveStickerMenu(false);
                      }}
                      className={cn(
                        "p-4 rounded-[24px] transition-all relative overflow-hidden",
                        tool === t.id ? "text-white" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      {tool === t.id && (
                        <motion.div 
                          layoutId="tool-bg"
                          className="absolute inset-0 bg-blue-600"
                        />
                      )}
                      <t.icon className="w-5 h-5 relative z-10" />
                    </button>
                  ))}
                  
                  <button
                    onClick={() => {
                      setShowSettings(!showSettings);
                      setActiveStickerMenu(false);
                    }}
                    className={cn(
                      "p-4 rounded-[24px] transition-all text-white/40 hover:text-white/60",
                      showSettings && "text-white"
                    )}
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="h-8 w-px bg-white/10 mx-2" />

                <div className="flex gap-2">
                  {['#FF3B30', '#34C759', '#007AFF', '#FFFFFF'].map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c);
                        setActiveStickerMenu(false);
                      }}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 transition-transform active:scale-90",
                        color.toLowerCase() === c.toLowerCase() ? "scale-110 border-white shadow-lg" : "border-transparent opacity-60"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  {/* Custom picked color if not in presets */}
                  {!['#FF3B30', '#34C759', '#007AFF', '#FFFFFF'].includes(color.toUpperCase()) && (
                    <button
                      className="w-7 h-7 rounded-full border-2 border-white scale-110 shadow-lg"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </div>
              </div>

              {/* Sticker Menu */}
              <AnimatePresence>
                {tool === 'sticker' && activeStickerMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="p-4 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[24px] shadow-2xl mb-4"
                  >
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['🚀', '🔥', '👍', '✨', '💡', '✅', '❌', '❤️', '👀', '📌', '🎨', '📸'].map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setSelectedSticker(s);
                            setActiveStickerMenu(false);
                          }}
                          className={cn(
                            "w-12 h-12 flex items-center justify-center text-2xl rounded-xl transition-all active:scale-90",
                            selectedSticker === s ? "bg-blue-600 scale-110" : "hover:bg-white/10"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Bar */}
              <div className="flex gap-3">
                <button 
                  onClick={handleClear}
                  className="p-5 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-3xl border border-white/10 transition-colors"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 bg-white text-black py-5 rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl",
                    isSaving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" />
                      Save & Post
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}

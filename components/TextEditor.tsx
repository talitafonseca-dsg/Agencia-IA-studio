import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Type, Move, Palette, ArrowRight, Sun, Layers, Droplet, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Square, Image as ImageIcon, Upload, Sparkles, Loader2, Copy, Scissors, Eraser, FlipHorizontal, FlipVertical } from 'lucide-react';
import { GeneratedImage } from '../types';
import { editGeneratedImage } from '../services/geminiService';
import { removeBackground } from "@imgly/background-removal";



interface BaseLayer {
    id: string;
    position: { x: number; y: number }; // Percentage 0-100
    rotation: number; // Degrees 0-360
    flipX?: boolean;
    flipY?: boolean;
}

interface TextLayer extends BaseLayer {
    type: 'text';
    text: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    maxWidth: number; // Percentage
    lineHeight: number; // New: Line Height Multiplier (default 1.2)
    shadow: { enabled: boolean; color: string; blur: number };
    outline: { enabled: boolean; color: string; width: number };
    glow: { enabled: boolean; color: string };
    box: { enabled: boolean; color: string; opacity: number; padding: number; borderRadius: number };
}

interface ImageLayer extends BaseLayer {
    type: 'image';
    url: string;
    width: number; // Percentage of canvas width
    opacity: number;
    // Potential for future: shadow, border etc for images
}

type Layer = TextLayer | ImageLayer;

const FONTS = [
    'Inter', 'Roboto', 'Montserrat', 'Playfair Display', 'Oswald',
    'Dancing Script', 'Anton', 'Bebas Neue', 'Pacifico', 'Lobster',
    'Abril Fatface', 'Comfortaa'
];

interface TextEditorProps {
    image: GeneratedImage;
    initialLayers?: Layer[];
    initialText?: string;
    onClose: () => void;
    onSave: (url: string, backgroundUrl?: string) => void;
    onUpdate: (layers: Layer[]) => void;
    onMagicEdit?: (prompt: string) => Promise<void>;
    aspectRatio: string;
}

export const TextEditor: React.FC<TextEditorProps> = ({ image, initialLayers, initialText, onClose, onSave, onUpdate, onMagicEdit, aspectRatio }) => {
    // LAYERS STATE
    const [layers, setLayers] = useState<Layer[]>(initialLayers || []);
    const [activeLayerId, setActiveLayerId] = useState<string>('layer-1');

    useEffect(() => {
        console.log("TextEditor Mounted. Version: Local Assets + Tools Section");
    }, []);
    const [isDragging, setIsDragging] = useState(false);
    const [snapGuides, setSnapGuides] = useState({ x: false, y: false });

    // Magic Edit State
    const [magicPrompt, setMagicPrompt] = useState('');
    const [isMagicEditing, setIsMagicEditing] = useState(false);
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [backgroundImageUrl, setBackgroundImageUrl] = useState(image.originalUrl || image.url); // Local override for background

    // Canvas ref for capturing image
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Update local state when prop changes
    useEffect(() => {
        if (image?.url) {
            // Prefer originalUrl (clean) so we don't double-bake text, unless we only have url
            setBackgroundImageUrl(image.originalUrl || image.url);
        }
    }, [image?.url, image?.originalUrl]);

    const handleMagicEditOptimized = async () => {
        if (!magicPrompt.trim()) return;
        setIsMagicEditing(true);
        try {
            if (onMagicEdit) {
                await onMagicEdit(magicPrompt);
                // The parent component updates the image prop, which triggers the useEffect to update backgroundImageUrl
                // However, we might want to manually clear prompt here
                setMagicPrompt('');
            } else {
                console.warn("onMagicEdit prop missing, attempting direct call (might fail without API key)");
                // Fallback (might fail if apiKey is not available in context)
                const newImageBase64 = await editGeneratedImage(backgroundImageUrl, magicPrompt, aspectRatio);
                setBackgroundImageUrl(newImageBase64);
                setMagicPrompt('');
            }
        } catch (e: any) {
            console.error(e);
            const msg = e?.message || '';
            if (msg.includes('429') || msg.toLowerCase().includes('cota') || msg.toLowerCase().includes('quota')) {
                alert("Limite da conta compartilhada atingido. Por favor, adicione sua própria Chave API para continuar.");
            } else {
                alert("Erro na edição: " + msg);
            }
        } finally {
            setIsMagicEditing(false);
        }
    };

    const handleRemoveBackground = async () => {
        if (!backgroundImageUrl) return;
        setIsRemovingBg(true);
        try {
            console.log("Starting background removal via CDN...");
            const blob = await removeBackground(backgroundImageUrl, {
                debug: true,
                progress: (key: string, current: number, total: number) => {
                    console.log(`BG Removal progress: ${key} ${Math.round((current / total) * 100)}%`);
                }
            });
            console.log("Background removed successfully, blob:", blob);
            const newUrl = URL.createObjectURL(blob);
            setBackgroundImageUrl(newUrl);
        } catch (e: any) {
            console.error("Background removal failed:", e);
            alert(`Erro ao remover fundo: ${e.message || JSON.stringify(e)}. Verifique o console.`);
        } finally {
            setIsRemovingBg(false);
        }
    };

    const handleRemoveLayerBackground = async () => {
        if (!activeLayer || activeLayer.type !== 'image') return;
        const imgLayer = activeLayer as ImageLayer;
        setIsRemovingBg(true);
        try {
            console.log("Starting layer background removal via CDN...");
            const blob = await removeBackground(imgLayer.url, {
                debug: true,
                progress: (key: string, current: number, total: number) => {
                    console.log(`Layer BG Removal progress: ${key} ${Math.round((current / total) * 100)}%`);
                }
            });
            console.log("Layer background removed successfully");
            const newUrl = URL.createObjectURL(blob);
            updateLayer({ url: newUrl });
        } catch (e: any) {
            console.error("Layer background removal failed:", e);
            alert(`Erro ao remover fundo da imagem: ${e.message || JSON.stringify(e)}`);
        } finally {
            setIsRemovingBg(false);
        }
    };


    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Derived active layer
    const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];

    // ALIGNMENT HELPERS
    const alignLayer = (alignment: 'left' | 'center' | 'right') => {
        let newX = 50;
        let newTextAlign: 'left' | 'center' | 'right' = 'center';

        if (alignment === 'left') {
            newX = 10; // 10% from left
            newTextAlign = 'left';
        } else if (alignment === 'center') {
            newX = 50;
            newTextAlign = 'center';
        } else if (alignment === 'right') {
            newX = 90; // 90% from left (10% from right)
            newTextAlign = 'right';
        }

        updateLayer({
            position: { ...activeLayer.position, x: newX },
            textAlign: newTextAlign
        });
    };

    const updateLayer = (updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, ...updates } as Layer : l));
    };

    const addTextLayer = () => {
        const newId = `layer-${Math.random().toString(36).substr(2, 5)}`;
        const newLayer: TextLayer = {
            id: newId,
            type: 'text',
            text: 'Novo Texto',
            position: { x: 50, y: 50 },
            rotation: 0,
            color: '#ffffff',
            fontSize: 48,
            fontFamily: 'Inter',
            textAlign: 'center',
            maxWidth: 80,
            lineHeight: 1.2,
            shadow: { enabled: true, color: '#000000', blur: 10 },
            outline: { enabled: false, color: '#000000', width: 2 },
            glow: { enabled: false, color: '#FF00FF' },
            box: { enabled: false, color: '#000000', opacity: 0.5, padding: 20, borderRadius: 10 }
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newId);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                const newId = `img-${Math.random().toString(36).substr(2, 5)}`;
                const newLayer: ImageLayer = {
                    id: newId,
                    type: 'image',
                    url: dataUrl,
                    position: { x: 50, y: 50 },
                    rotation: 0,
                    width: 30, // Default 30% width
                    opacity: 1
                };
                setLayers(prev => [...prev, newLayer]);
                setActiveLayerId(newId);
            }
        };
        reader.readAsDataURL(file);
    };

    const duplicateLayer = () => {
        if (!activeLayer) return;

        const newId = `${activeLayer.type}-${Math.random().toString(36).substr(2, 5)}`;
        // Deep copy the layer object
        const newLayer = JSON.parse(JSON.stringify(activeLayer));
        newLayer.id = newId;
        // Offset so it doesn't appear exactly on top
        newLayer.position.x = Math.min(newLayer.position.x + 5, 95);
        newLayer.position.y = Math.min(newLayer.position.y + 5, 95);

        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newId);
    };

    const removeLayer = () => {
        if (layers.length === 0) return;
        const newLayers = layers.filter(l => l.id !== activeLayerId);
        setLayers(newLayers);
        // If we deleted the last layer, activeLayerId becomes undefined/null effectively
        if (newLayers.length > 0) {
            setActiveLayerId(newLayers[newLayers.length - 1].id);
        } else {
            setActiveLayerId(''); // Clear active layer
        }
    };


    // Load Google Fonts dynamically
    useEffect(() => {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Anton&family=Bebas+Neue&family=Comfortaa&family=Dancing+Script&family=Inter:wght@400;900&family=Lobster&family=Montserrat:wght@400;900&family=Oswald:wght@500&family=Pacifico&family=Playfair+Display:ital,wght@0,400;1,700&family=Roboto:wght@400;900&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

    // RESET OR RESTORE CANVAS WHEN IMAGE CHANGES
    useEffect(() => {
        if (image) {
            if (initialLayers && initialLayers.length > 0) {
                // Restore persisted layers
                setLayers(initialLayers);
                setActiveLayerId(initialLayers[0].id);
            } else if (initialText) {
                // Initialize default layers for new image ONLY if initialText is provided
                const defaultId = `text-${Math.random().toString(36).substr(2, 9)}`;
                setLayers([
                    {
                        id: defaultId,
                        type: 'text',
                        text: initialText,
                        position: { x: 50, y: 20 },
                        rotation: 0,
                        color: '#ffffff',
                        fontSize: 48,
                        fontFamily: 'Inter',
                        textAlign: 'center',
                        maxWidth: 80,
                        lineHeight: 1.2,
                        shadow: { enabled: true, color: '#000000', blur: 10 },
                        outline: { enabled: false, color: '#000000', width: 2 },
                        glow: { enabled: false, color: '#FF00FF' },
                        box: {
                            enabled: image.layoutMode === 'box',
                            color: '#000000',
                            opacity: 0.5,
                            padding: 20,
                            borderRadius: 10
                        }
                    }
                ]);
                setActiveLayerId(defaultId);
            } else {
                // Start with NO layers if no initial text or layers provided
                setLayers([]);
                setActiveLayerId('');
            }
        }
    }, [image?.id]); // Depend on image ID (initialLayers should be stable or refs)

    // Persist changes
    useEffect(() => {
        if (layers.length > 0 && onUpdate) {
            onUpdate(layers);
        }
    }, [layers, onUpdate]);

    if (!image) return null;

    // DRAG LOGIC (Updates ONLY Active Layer position)
    const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
        e.stopPropagation();
        setActiveLayerId(layerId);
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && containerRef.current && activeLayer) {
            const rect = containerRef.current.getBoundingClientRect();
            // Clamp values 0-100
            const rawX = ((e.clientX - rect.left) / rect.width) * 100;
            const rawY = ((e.clientY - rect.top) / rect.height) * 100;

            // STRICT BOUNDS (Keep center somewhat inside)
            // STRICT BOUNDS (Keep center somewhat inside)
            // Calculate half-width in percentage to keep edges inside
            let halfWidth = 0;
            if (activeLayer.type === 'text') {
                halfWidth = ((activeLayer as TextLayer).maxWidth || 80) / 2;
            } else {
                halfWidth = ((activeLayer as ImageLayer).width || 30) / 2;
            }

            // Limit bounds so the box edges can't leave canvas (0 to 100)
            // If width > 100, we clamp to center (50)
            const minX = Math.min(50, halfWidth);
            const maxX = Math.max(50, 100 - halfWidth);

            let x = Math.max(minX, Math.min(maxX, rawX));
            let y = Math.max(5, Math.min(95, rawY));

            // SMART GUIDES (Snap to Center)
            const SNAP_THRESHOLD = 2; // Increased threshold for easier snapping
            let newSnaps = { x: false, y: false };

            // Snap X (Center)
            if (Math.abs(x - 50) < SNAP_THRESHOLD) {
                x = 50;
                newSnaps.x = true;
            }

            // Snap Y (Center)
            if (Math.abs(y - 50) < SNAP_THRESHOLD) {
                y = 50;
                newSnaps.y = true;
            }

            setSnapGuides(newSnaps);
            setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, position: { x, y } } : l));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setSnapGuides({ x: false, y: false });
    };

    // CANVAS DRAWING (Support Wrapping)
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
        // Simple normalization of newlines
        const normalizedText = text.replace(/\r\n/g, '\n');
        const paragraphs = normalizedText.split('\n');
        let lines: string[] = [];

        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = ctx.measureText(currentLine + " " + word).width;
                if (width < maxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
        });
        return lines;
    };

    const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        // USE THE LOCAL BACKGROUND STATE (Clean or Magic Edited), NOT the baked image.url
        img.src = backgroundImageUrl;

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            if (ctx) {
                const scale = canvas.width / 800; // Normalization scale

                // RENDER EACH LAYER
                // RENDER EACH LAYER
                layers.forEach(layer => {
                    ctx?.save(); // ISOLATE STATE FOR EACH LAYER

                    const xPos = (layer.position.x / 100) * canvas.width;
                    const yPos = (layer.position.y / 100) * canvas.height;

                    // APPLY TRANSFORMS (Translate -> Rotate -> Scale)
                    // We move context to the center of the object, then apply rotation and flip.
                    // Subsequent drawing must be relative to (0, 0).
                    ctx.translate(xPos, yPos);
                    ctx.rotate((layer.rotation * Math.PI) / 180);
                    ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);

                    if (layer.type === 'image') {
                        // IMAGE RENDERING
                        const imgLayer = layer as ImageLayer;
                        const layerImg = new Image();
                        layerImg.src = imgLayer.url;

                        const finalWidth = (imgLayer.width / 100) * canvas.width;
                        const finalHeight = finalWidth * (layerImg.height / layerImg.width) || finalWidth; // Maintain aspect ratio

                        ctx.globalAlpha = imgLayer.opacity;
                        // Draw centered at (0,0)
                        ctx.drawImage(layerImg, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);
                        ctx.globalAlpha = 1.0;
                    }

                    if (layer.type === 'text') { // EXPLICIT CHECK
                        // TEXT RENDERING
                        const textLayer = layer as TextLayer;
                        const finalFontSize = textLayer.fontSize * scale;
                        ctx.font = `bold ${finalFontSize}px ${textLayer.fontFamily}`;
                        ctx.textAlign = textLayer.textAlign;
                        ctx.textBaseline = 'middle';

                        const maxPxWidth = (textLayer.maxWidth / 100) * canvas.width;

                        // ALIGNMENT FIX (Relative to 0,0)
                        // If center, drawX is 0.
                        // If left, start at left edge of the box (-width/2).
                        // If right, start at right edge of the box (+width/2).
                        let drawX = 0;
                        if (textLayer.textAlign === 'left') {
                            drawX = -(maxPxWidth / 2);
                        } else if (textLayer.textAlign === 'right') {
                            drawX = (maxPxWidth / 2);
                        }

                        const lines = wrapText(ctx, textLayer.text, maxPxWidth);

                        // DRAW TEXT & BACKGROUNDS STRIPS (Canvas)
                        const lineHeightVal = finalFontSize * (textLayer.lineHeight || 1.2);
                        const totalHeight = lines.length * lineHeightVal;
                        // Start Y relative to 0
                        const startY = -(totalHeight / 2) + (lineHeightVal / 2);

                        lines.forEach((line, i) => {
                            const lineY = startY + (i * lineHeightVal);
                            const lineWidth = ctx.measureText(line).width;

                            // DRAW BACKGROUND STRIP FOR THIS LINE
                            if (textLayer.box?.enabled) {
                                const padding = textLayer.box.padding * scale;
                                const boxWidth = lineWidth + (padding * 2);
                                const boxHeight = lineHeightVal + (padding * 0.2);
                                const boxRadius = textLayer.box.borderRadius * scale;

                                let boxX = drawX;
                                if (textLayer.textAlign === 'left') {
                                    boxX = drawX - padding;
                                } else if (textLayer.textAlign === 'center') {
                                    boxX = drawX - (boxWidth / 2);
                                } else if (textLayer.textAlign === 'right') {
                                    boxX = drawX + padding - boxWidth;
                                }

                                const boxY = lineY - (lineHeightVal / 2) - (padding / 4);

                                ctx.save();
                                ctx.globalAlpha = textLayer.box.opacity;
                                ctx.fillStyle = textLayer.box.color;
                                drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight + (padding / 2), boxRadius);
                                ctx.fill();
                                ctx.restore();
                            }

                            // 1. GLOW
                            if (textLayer.glow.enabled) {
                                ctx.shadowColor = textLayer.glow.color;
                                ctx.shadowBlur = 20 * scale;
                                ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
                                ctx.fillStyle = textLayer.color;
                                ctx.fillText(line, drawX, lineY);
                            }

                            // 2. SHADOW (If glow off)
                            if (textLayer.shadow.enabled && !textLayer.glow.enabled) {
                                ctx.shadowColor = textLayer.shadow.color;
                                ctx.shadowBlur = textLayer.shadow.blur * scale;
                                const clampedOffset = Math.min(4 * scale, 15);
                                // Shadows must respect flip direction? 
                                // Actually ctx.shadow follows the transform! So if flipped, shadow flips. 
                                // This is usually desired for "physical" flip.
                                ctx.shadowOffsetX = clampedOffset;
                                ctx.shadowOffsetY = clampedOffset;
                            } else if (!textLayer.glow.enabled) {
                                ctx.shadowColor = 'transparent';
                                ctx.shadowBlur = 0;
                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 0;
                            }

                            // 3. OUTLINE (Stroke)
                            if (textLayer.outline?.enabled) {
                                ctx.strokeStyle = textLayer.outline.color;
                                ctx.lineWidth = textLayer.outline.width * scale;
                                ctx.strokeText(line, drawX, lineY);
                            }

                            // 4. MAIN FILL
                            ctx.fillStyle = textLayer.color;
                            ctx.fillText(line, drawX, lineY);

                            ctx.shadowColor = 'transparent';
                            ctx.shadowBlur = 0;
                            ctx.shadowOffsetX = 0;
                            ctx.shadowOffsetY = 0;
                        });
                    }

                    ctx?.restore(); // RESTORE STATE (Pops the matrix, returning to global coords)
                });

                try {
                    // Pass BOTH the Final Flattened Image AND the Current Background (clean)
                    onSave(canvas.toDataURL('image/png'), backgroundImageUrl);
                } catch (e) {
                    console.error("Canvas export failed", e);
                    onClose();
                }
            }
        };

        img.onerror = () => onClose();
    };


    if (!image) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-[#09090b] flex text-white overflow-hidden font-sans">
            {/* GLOBAL SLIDER STYLES */}
            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    margin-top: -6px; /* Adjust for track vertical alignment if needed */
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                    transition: transform 0.1s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                input[type=range]::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                }
            `}</style>

            {/* LEFT SIDEBAR - LAYERS & ASSETS */}
            <div className="w-[80px] md:w-[240px] bg-[#121212] border-r border-white/10 flex flex-col z-20">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-4">
                    <div className="hidden md:block">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Editor</h3>
                        <p className="text-[10px] text-white/40 font-bold">Studio AI</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors" title="Fechar">
                        <X size={18} />
                    </button>
                </header>

                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    {/* ADD BUTTONS */}
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={addTextLayer} className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-indigo-900/20">
                            <Type size={16} /> <span className="hidden md:inline">Adicionar Texto</span>
                        </button>
                        <div className="relative">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-xl font-bold text-xs uppercase tracking-wider text-white border border-white/10">
                                <ImageIcon size={16} /> <span className="hidden md:inline">Adicionar Imagem</span>
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 my-2"></div>

                    {/* LAYER LIST */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1 hidden md:block">Camadas</p>
                        {layers.slice().reverse().map((layer, index) => (
                            <div
                                key={layer.id}
                                onClick={() => setActiveLayerId(layer.id)}
                                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${activeLayerId === layer.id ? 'bg-white/10 border-white/20 shadow-md' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white/70 ${layer.type === 'text' ? 'bg-indigo-500/20' : 'bg-purple-500/20'}`}>
                                    {layer.type === 'text' ? <Type size={14} /> : <ImageIcon size={14} />}
                                </div>
                                <div className="flex-1 min-w-0 hidden md:block">
                                    <p className="text-xs font-bold text-white truncate max-w-[120px]">
                                        {layer.type === 'text' ? (layer as TextLayer).text || 'Texto Vazio' : 'Imagem'}
                                    </p>
                                    <p className="text-[10px] text-white/30">Camada {layers.length - index}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeLayer(); }}
                                    className={`p-1.5 rounded-md text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity ${activeLayerId === layer.id ? 'opacity-100' : ''}`}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CENTER - CANVAS AREA */}
            <div className="flex-1 bg-[#0c0c0e] relative flex items-center justify-center overflow-hidden pattern-dots">
                <div
                    className="relative shadow-2xl transition-transform duration-200 ease-out"
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ maxHeight: '85vh', maxWidth: '85vw', aspectRatio: 'auto' }} // Ensure it fits but keeps ratio
                >
                    <img
                        src={backgroundImageUrl}
                        className="max-h-[85vh] max-w-[85vw] object-contain pointer-events-none select-none shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        onLoad={() => {
                            // Optional: Auto-fit logic could go here
                        }}
                    />

                    {/* SMART GUIDES OVERLAY */}
                    {snapGuides.x && <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-indigo-500 z-50 transform -translate-x-1/2 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}
                    {snapGuides.y && <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-indigo-500 z-50 transform -translate-y-1/2 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}

                    {/* RENDER LAYERS */}
                    {layers.map(layer => {
                        if (layer.type === 'image') {
                            return (
                                <div
                                    key={layer.id}
                                    className={`absolute cursor-move select-none z-10 ${activeLayerId === layer.id ? 'z-20' : ''}`}
                                    style={{
                                        left: `${layer.position.x}%`,
                                        top: `${layer.position.y}%`,
                                        transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
                                        width: `${layer.width}%`,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, layer.id)}
                                >
                                    <img src={layer.url} className="w-full h-full object-contain pointer-events-none" style={{ opacity: layer.opacity }} />
                                    {activeLayerId === layer.id && <div className="absolute -inset-2 border-2 border-dashed border-indigo-500 rounded-lg pointer-events-none animate-pulse"></div>}
                                </div>
                            );
                        }

                        // TEXT LAYER
                        const textLayer = layer as TextLayer;
                        const style: React.CSSProperties = {
                            color: textLayer.color,
                            fontSize: `${textLayer.fontSize}px`,
                            fontFamily: textLayer.fontFamily,
                            fontWeight: 700,
                            lineHeight: textLayer.lineHeight || 1.2,
                        };

                        if (textLayer.box?.enabled) {
                            const r = parseInt(textLayer.box.color.slice(1, 3), 16);
                            const g = parseInt(textLayer.box.color.slice(3, 5), 16);
                            const b = parseInt(textLayer.box.color.slice(5, 7), 16);
                            style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${textLayer.box.opacity})`;
                            style.padding = `${textLayer.box.padding / 2}px ${textLayer.box.padding}px`;
                            style.borderRadius = `${textLayer.box.borderRadius}px`;
                            style.boxDecorationBreak = 'clone';
                            style.WebkitBoxDecorationBreak = 'clone';
                        }

                        // TEXT SHADOWS
                        const shadows = [];
                        if (textLayer.glow?.enabled) shadows.push(`0 0 20px ${textLayer.glow.color}`, `0 0 40px ${textLayer.glow.color}`);
                        if (textLayer.shadow?.enabled) shadows.push(`4px 4px ${textLayer.shadow.blur}px ${textLayer.shadow.color}`);
                        if (shadows.length > 0) style.textShadow = shadows.join(', ');
                        if (textLayer.outline?.enabled) style.WebkitTextStroke = `${textLayer.outline.width}px ${textLayer.outline.color}`;

                        return (
                            <div
                                key={layer.id}
                                className={`absolute cursor-move select-none z-10 ${activeLayerId === layer.id ? 'z-20' : ''}`}
                                style={{
                                    left: `${layer.position.x}%`,
                                    top: `${layer.position.y}%`,
                                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
                                    width: `${textLayer.maxWidth}%`,
                                    textAlign: textLayer.textAlign,
                                }}
                                onMouseDown={(e) => handleMouseDown(e, layer.id)}
                            >
                                <span style={{ ...style, display: 'inline', whiteSpace: 'pre-wrap', position: 'relative' }}>{textLayer.text}</span>
                                {activeLayerId === layer.id && <div className="absolute -inset-4 border-2 border-dashed border-indigo-500/50 rounded-xl pointer-events-none"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT SIDEBAR - PROPERTIES */}
            <div className="w-[360px] bg-[#121212] border-l border-white/10 flex flex-col z-20">
                <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Propriedades</h3>
                    <div className="flex gap-2">
                        {/* DUPLICATE BUTTON */}
                        <button
                            onClick={duplicateLayer}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 p-2 rounded-lg transition-colors flex items-center gap-2"
                            title="Duplicar Camada"
                        >
                            <Plus size={16} /> {/* Using Plus icon for now as valid Copy icon, imported Plus earlier */}
                        </button>

                        {/* DELETE BUTTON (ALWAYS VISIBLE FOR ACTIVE LAYER) */}
                        <button
                            onClick={removeLayer}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition-colors"
                            title="Remover Camada Selecionada"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {/* TOOLS SECTION */}
                    <div className="bg-white/5 border border-indigo-500/30 rounded-xl p-4 mb-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
                            Ferramentas (IA)
                        </h4>
                        <button
                            onClick={activeLayer?.type === 'image' ? handleRemoveLayerBackground : handleRemoveBackground}
                            disabled={isRemovingBg || isMagicEditing}
                            className={`w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95 ${isRemovingBg ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={activeLayer?.type === 'image' ? 'Remover o fundo da imagem selecionada' : 'Remover o fundo da imagem principal'}
                        >
                            {isRemovingBg ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
                            {isRemovingBg ? 'Removendo...' : (activeLayer?.type === 'image' ? 'Remover Fundo (Camada)' : 'Remover Fundo')}
                        </button>
                    </div>

                    {/* MAGIC EDIT SECTION */}
                    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                            <Sparkles size={48} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
                            <Sparkles size={14} /> Edição Mágica (IA)
                        </h4>



                        <p className="text-[10px] text-white/60 mb-3 leading-relaxed">
                            Descreva o que você quer mudar na imagem. Ex: "Mude o fundo para azul", "Adicione óculos no modelo".
                        </p>
                        <textarea
                            value={magicPrompt}
                            onChange={(e) => setMagicPrompt(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-white/20 outline-none focus:border-indigo-500 transition-all resize-none h-20 mb-3"
                            placeholder="Digite sua alteração..."
                            disabled={isMagicEditing || isRemovingBg}
                        />
                        <button
                            onClick={handleMagicEditOptimized}
                            disabled={isMagicEditing || !magicPrompt.trim() || isRemovingBg}
                            className={`w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 ${isMagicEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isMagicEditing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isMagicEditing ? 'Gerando...' : 'Gerar Alteração'}
                        </button>
                    </div>

                    <div className="h-px bg-white/10"></div>

                    {activeLayer ? (
                        activeLayer.type === 'text' ? (
                            <>
                                {/* TEXT INPUT */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2"><Type size={12} /> Conteúdo</label>
                                    <textarea
                                        value={(activeLayer as TextLayer).text}
                                        onChange={e => updateLayer({ text: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none h-24 resize-none text-white font-medium scrollbar-thin transition-colors"
                                        placeholder="Digite seu texto..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                        {[
                                            { align: 'left', icon: AlignLeft, label: 'Esquerda' },
                                            { align: 'center', icon: AlignCenter, label: 'Centro' },
                                            { align: 'right', icon: AlignRight, label: 'Direita' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.align}
                                                onClick={() => alignLayer(opt.align as any)}
                                                className={`p-2 rounded-lg flex items-center gap-2 transition-all ${(activeLayer as TextLayer).textAlign === opt.align ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'}`}
                                                title={`Alinhar ${opt.label}`}
                                            >
                                                <opt.icon size={14} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* MAIN STYLES CARD */}
                                <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-2">Estilo Principal</label>

                                    {/* Color & Font */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-white/30 uppercase">Cor</span>
                                            <div className="h-10 w-full bg-black/40 rounded-lg border border-white/10 flex items-center px-2 gap-2">
                                                <input type="color" value={(activeLayer as TextLayer).color} onChange={e => updateLayer({ color: e.target.value })} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer" />
                                                <span className="text-[10px] font-mono text-white/70">{(activeLayer as TextLayer).color}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-white/30 uppercase">Tamanho</span>
                                            <input type="number" value={(activeLayer as TextLayer).fontSize} onChange={e => updateLayer({ fontSize: Number(e.target.value) })} className="w-full h-10 bg-gray-800 border border-white/10 rounded-lg px-2 text-xs text-white focus:bg-gray-700 transition-all" />
                                        </div>
                                    </div>

                                    {/* Font Family */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-white/50 uppercase font-semibold">Fonte</span>
                                        <select
                                            value={(activeLayer as TextLayer).fontFamily}
                                            onChange={e => updateLayer({ fontFamily: e.target.value })}
                                            className="w-full h-10 bg-gray-800 border border-white/10 rounded-lg px-2 text-xs text-white focus:bg-gray-700 transition-all"
                                            style={{ fontFamily: (activeLayer as TextLayer).fontFamily }}
                                        >
                                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>

                                    {/* NEW: Layout Controls (Line Height & Max Width) */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-white/50 uppercase font-semibold">Espaçamento</span>
                                            <input
                                                type="range"
                                                min="0.8"
                                                max="2.5"
                                                step="0.1"
                                                value={(activeLayer as TextLayer).lineHeight || 1.2}
                                                onChange={e => updateLayer({ lineHeight: Number(e.target.value) })}
                                                className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-white/50 uppercase font-semibold">Largura da Caixa</span>
                                            <input
                                                type="range"
                                                min="20"
                                                max="100"
                                                value={(activeLayer as TextLayer).maxWidth || 80}
                                                onChange={e => updateLayer({ maxWidth: Number(e.target.value) })}
                                                className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-[10px] text-white/50 uppercase font-semibold">Rotação</span>
                                                <span className="text-[10px] text-white/50">{Math.round((activeLayer as TextLayer).rotation || 0)}°</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={(activeLayer as TextLayer).rotation || 0}
                                                onChange={e => updateLayer({ rotation: Number(e.target.value) })}
                                                className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors"
                                            />
                                        </div>
                                        <div className="col-span-2 flex gap-2">
                                            <button onClick={() => updateLayer({ flipX: !(activeLayer as TextLayer).flipX })} className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeLayer.flipX ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white/50 hover:bg-gray-700'}`} title="Inverter Horizontal">
                                                <FlipHorizontal size={14} /> <span className="text-[10px] uppercase font-bold">Inverter H.</span>
                                            </button>
                                            <button onClick={() => updateLayer({ flipY: !(activeLayer as TextLayer).flipY })} className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeLayer.flipY ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white/50 hover:bg-gray-700'}`} title="Inverter Vertical">
                                                <FlipVertical size={14} /> <span className="text-[10px] uppercase font-bold">Inverter V.</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* TEXT BOX EFFECTS - HIGHLIGHTED */}
                                <div className={`rounded-xl p-4 border transition-all duration-300 ${(activeLayer as TextLayer).box.enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer select-none" onClick={() => updateLayer({ box: { ...(activeLayer as TextLayer).box, enabled: !((activeLayer as TextLayer).box.enabled) } })}>
                                            <Square size={14} className={(activeLayer as TextLayer).box.enabled ? 'text-green-400' : 'text-white/30'} />
                                            <span className={(activeLayer as TextLayer).box.enabled ? 'text-green-400' : 'text-white/50'}>Fundo (Box)</span>
                                        </label>
                                        <input type="checkbox" checked={(activeLayer as TextLayer).box.enabled} onChange={e => updateLayer({ box: { ...(activeLayer as TextLayer).box, enabled: e.target.checked } })} className="accent-green-500 w-4 h-4" />
                                    </div>

                                    {(activeLayer as TextLayer).box.enabled && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2 mb-4">
                                                <span className="text-[10px] text-white/50 uppercase font-semibold">Cor do Box</span>
                                                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-xl border border-white/5">
                                                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-lg shrink-0 group hover:border-white/40 transition-colors">
                                                        <input type="color" value={(activeLayer as TextLayer).box.color} onChange={e => updateLayer({ box: { ...(activeLayer as TextLayer).box, color: e.target.value } })} className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 m-0" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-white/40 mb-1">Hex Code</p>
                                                        <div className="w-full h-9 bg-black/40 rounded-lg flex items-center px-3 text-sm font-mono text-white/90 border border-white/10">
                                                            {(activeLayer as TextLayer).box.color.toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-[10px] text-white/50 uppercase font-semibold block mb-2">Opacidade</span>
                                                    <input type="range" min="0" max="1" step="0.1" value={(activeLayer as TextLayer).box.opacity} onChange={e => updateLayer({ box: { ...(activeLayer as TextLayer).box, opacity: Number(e.target.value) } })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-green-500 hover:bg-gray-500 transition-colors" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-white/50 uppercase font-semibold block mb-2">Padding</span>
                                                    <input type="range" min="0" max="100" value={(activeLayer as TextLayer).box.padding} onChange={e => updateLayer({ box: { ...(activeLayer as TextLayer).box, padding: Number(e.target.value) } })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-green-500 hover:bg-gray-500 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* OTHER EFFECTS */}
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Shadow */}
                                    <div className={`p-3 rounded-xl border transition-all ${(activeLayer as TextLayer).shadow.enabled ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10'}`}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase text-white/70 flex items-center gap-2"><Layers size={14} /> Sombra</label>
                                            <input type="checkbox" checked={(activeLayer as TextLayer).shadow.enabled} onChange={e => updateLayer({ shadow: { ...(activeLayer as TextLayer).shadow, enabled: e.target.checked } })} className="accent-indigo-500 w-4 h-4" />
                                        </div>
                                        {(activeLayer as TextLayer).shadow.enabled && (
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-xl border border-white/5">
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 shrink-0">
                                                        <input type="color" value={(activeLayer as TextLayer).shadow.color} onChange={e => updateLayer({ shadow: { ...(activeLayer as TextLayer).shadow, color: e.target.value } })} className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input type="range" min="0" max="50" value={(activeLayer as TextLayer).shadow.blur} onChange={e => updateLayer({ shadow: { ...(activeLayer as TextLayer).shadow, blur: Number(e.target.value) } })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Outline */}
                                    <div className={`p-3 rounded-xl border transition-all ${(activeLayer as TextLayer).outline.enabled ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10'}`}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase text-white/70 flex items-center gap-2"><Type size={14} /> Contorno</label>
                                            <input type="checkbox" checked={(activeLayer as TextLayer).outline.enabled} onChange={e => updateLayer({ outline: { ...(activeLayer as TextLayer).outline, enabled: e.target.checked } })} className="accent-indigo-500 w-4 h-4" />
                                        </div>
                                        {(activeLayer as TextLayer).outline.enabled && (
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-xl border border-white/5">
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 shrink-0">
                                                        <input type="color" value={(activeLayer as TextLayer).outline.color} onChange={e => updateLayer({ outline: { ...(activeLayer as TextLayer).outline, color: e.target.value } })} className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input type="range" min="1" max="10" value={(activeLayer as TextLayer).outline.width} onChange={e => updateLayer({ outline: { ...(activeLayer as TextLayer).outline, width: Number(e.target.value) } })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </>
                        ) : (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                                <h4 className="text-[10px] font-bold uppercase text-white/50">Propriedades da Imagem</h4>

                                {/* REMOVE BACKGROUND FROM THIS LAYER */}
                                <button
                                    onClick={handleRemoveLayerBackground}
                                    disabled={isRemovingBg || isMagicEditing}
                                    className={`w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 ${isRemovingBg ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Remover o fundo desta imagem"
                                >
                                    {isRemovingBg ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
                                    {isRemovingBg ? 'Removendo Fundo...' : 'Remover Fundo da Imagem'}
                                </button>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span className="text-[10px] text-white/50 uppercase font-semibold">Largura</span> <span className="text-[10px] text-white/50">{(activeLayer as ImageLayer).width}%</span></div>
                                        <input type="range" min="5" max="100" value={(activeLayer as ImageLayer).width} onChange={e => updateLayer({ width: Number(e.target.value) })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span className="text-[10px] text-white/50 uppercase font-semibold">Opacidade</span> <span className="text-[10px] text-white/50">{Math.round((activeLayer as ImageLayer).opacity * 100)}%</span></div>
                                        <input type="range" min="0" max="1" step="0.1" value={(activeLayer as ImageLayer).opacity} onChange={e => updateLayer({ opacity: Number(e.target.value) })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span className="text-[10px] text-white/50 uppercase font-semibold">Rotação</span> <span className="text-[10px] text-white/50">{Math.round((activeLayer as ImageLayer).rotation || 0)}°</span></div>
                                        <input type="range" min="0" max="360" value={(activeLayer as ImageLayer).rotation || 0} onChange={e => updateLayer({ rotation: Number(e.target.value) })} className="w-full h-3 bg-gray-600 rounded-lg appearance-none accent-indigo-500 hover:bg-gray-500 transition-colors" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateLayer({ flipX: !(activeLayer as ImageLayer).flipX })} className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeLayer.flipX ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white/50 hover:bg-gray-700'}`} title="Inverter Horizontal">
                                            <FlipHorizontal size={14} /> <span className="text-[10px] uppercase font-bold">Inverter H.</span>
                                        </button>
                                        <button onClick={() => updateLayer({ flipY: !(activeLayer as ImageLayer).flipY })} className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeLayer.flipY ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white/50 hover:bg-gray-700'}`} title="Inverter Vertical">
                                            <FlipVertical size={14} /> <span className="text-[10px] uppercase font-bold">Inverter V.</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                        <div className="text-white/30 text-xs text-center p-4">Selecione uma camada para editar</div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-[#0c0c0e]">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] transform active:scale-[0.98]"
                    >
                        <Check size={16} strokeWidth={3} /> Salvar Arte
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                </div>

            </div>
        </div>
    );
};

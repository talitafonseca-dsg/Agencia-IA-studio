
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Upload,
  Loader2,
  AlertCircle,
  Users,
  Edit3,
  Layout,
  X,
  Eye,
  Type as TypeIcon,
  Layers,
  Sparkles,
  Settings,
  Cpu,
  Monitor,
  Zap,
  Box,
  Sliders,
  Activity,
  ArrowRight,
  Download,
  Camera,
  Play,
  FileText,
  Target,
  UserCheck,
  ImagePlus,
  Flame,
  Star,
  Maximize2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Type,
  Key,
  Image as ImageLucide,
  Plus,
  Check,
  ChevronLeft,
  User,
  ShoppingBag,
  Sticker,
  Move,
  ExternalLink,
  Folder,
  Save,
  Smile,
  Film
} from 'lucide-react';
import { CreationType, VisualStyle, StudioStyle, StudioStyleMeta, MascotStyle, MascotStyleMeta, MockupStyle, MockupStyleMeta, AspectRatio, SocialClass, GenerationConfig, GeneratedImage, ColorPalette, UGCEnvironment, UGCModel } from './types';
import { generateStudioCreative, editGeneratedImage, animateGeneratedImage } from './services/geminiService';
import { generatePPTX } from './services/pptService';
import { translations, Language } from './translations';
import { TextEditor } from './components/TextEditor';

import { AuthScreen } from './components/AuthScreen';
import { CheckoutPage } from './components/CheckoutPage';
import { CheckoutSuccess } from './components/CheckoutSuccess';
import { ApiKeyModal } from './components/ApiKeyModal';
import { jsPDF } from 'jspdf';
import { saveProject, canCreateProject, getRemainingSlots, Project } from './services/projectService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const initialConfig: GenerationConfig = {
    type: CreationType.SOCIAL_POST,
    style: VisualStyle.MODERN,
    studioStyle: StudioStyle.EXECUTIVO_PRO,
    mascotStyle: MascotStyle.PIXAR_3D,
    aspectRatio: AspectRatio.SQUARE,
    productDescription: '',
    copyText: '',
    ctaText: '',
    targetAudience: '',
    socialClass: SocialClass.MIDDLE,
    designCount: 3,
    slideCount: 3,
    useAiAvatar: true,
    isEditableMode: false,
    ugcEnvironment: UGCEnvironment.HOME
  };

  const [config, setConfig] = useState<GenerationConfig>(initialConfig);
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [studioRefImage, setStudioRefImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [customModelImage, setCustomModelImage] = useState<string | null>(null);
  const [stickerImage, setStickerImage] = useState<string | null>(null);
  const [mockupReferenceImage, setMockupReferenceImage] = useState<string | null>(null);
  const [isEditableMode, setIsEditableMode] = useState<boolean>(false);

  // Text Editor State
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 }); // Percentage
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(48);

  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);

  const [activePulseStep, setActivePulseStep] = useState<number | null>(null);
  const [showRatioSelector, setShowRatioSelector] = useState(true);
  const [isStep01Collapsed, setIsStep01Collapsed] = useState(false);

  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [activeVideos, setActiveVideos] = useState<Record<string, boolean>>({});

  // AUTH STATE
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // PERSISTENCE STATE
  const [persistentLayers, setPersistentLayers] = useState<Record<string, any[]>>({});

  // API KEY STATE (BYOK)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowApiKeyModal(true);
    }
  }, []);

  useEffect(() => {
    if (results.length > 0) {
      setIsStep01Collapsed(true);
    }
  }, [results]);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        // User logged in
      }
      setAuthLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = () => {
    setConfig(initialConfig);
    setUploadedImage(null);
    setStudioRefImage(null);
    setProductImage(null);
    setCustomModelImage(null);
    setStickerImage(null);
    setMockupReferenceImage(null);
    setResults([]);
    setError(null);
    setIsQuotaError(false);
    setSelectedImage(null);
    setActivePulseStep(null);
    setShowRatioSelector(true);
    setIsStep01Collapsed(false);
    setIsEditableMode(false);
  };

  const handleOpenApiKeyDialog = async () => {
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowApiKeyModal(false);
    setError(null);
    setIsQuotaError(false);
  };



  const getTypeIcon = (type: CreationType) => {
    switch (type) {
      case CreationType.SOCIAL_POST: return <ImageIcon size={20} className="text-pink-400" />;
      case CreationType.YOUTUBE_THUMB: return <Play size={20} className="text-red-400" />;

      case CreationType.STUDIO_PHOTO: return <Camera size={20} className="text-purple-400" />;
      case CreationType.MASCOT: return <Smile size={20} className="text-orange-400" />;
      case CreationType.MOCKUP: return <Box size={20} className="text-emerald-400" />;
      case CreationType.MOCKUP: return <Box size={20} className="text-emerald-400" />;
      case CreationType.CREATIVE_BACKGROUND: return <Layout size={20} className="text-cyan-400" />;
      default: return <Sparkles size={20} className="text-indigo-400" />;
    }
  };

  const handleTypeChange = (type: CreationType) => {
    let newRatio = AspectRatio.SQUARE;
    if (type === CreationType.YOUTUBE_THUMB) {
      newRatio = AspectRatio.LANDSCAPE_16_9;
    } else {
      switch (type) {
        case CreationType.SOCIAL_POST: newRatio = AspectRatio.STORY_9_16; break;

        case CreationType.STUDIO_PHOTO: newRatio = AspectRatio.CLASSIC_4_3; break;
        case CreationType.MOCKUP: newRatio = AspectRatio.PORTRAIT_3_4; break;
        case CreationType.CREATIVE_BACKGROUND: newRatio = AspectRatio.LANDSCAPE_16_9; break;
      }
    }
    setConfig(prev => ({ ...prev, type, aspectRatio: newRatio }));
    setShowRatioSelector(true);
    setActivePulseStep(2);
  };

  const processFileToPNG = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'subject' | 'reference' | 'product' | 'sticker' | 'customModel' | 'mockupReference') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const pngDataUrl = await processFileToPNG(file);

        if (field === 'subject') {
          setUploadedImage(pngDataUrl);
          setConfig(prev => ({ ...prev, useAiAvatar: false }));
        }
        if (field === 'reference') setStudioRefImage(pngDataUrl);
        if (field === 'product') setProductImage(pngDataUrl);
        if (field === 'customModel') setCustomModelImage(pngDataUrl);
        if (field === 'sticker') setStickerImage(pngDataUrl);
        if (field === 'mockupReference') setMockupReferenceImage(pngDataUrl);
        setError(null);
        setIsQuotaError(false);
      } catch (err) {
        console.error("Error processing image:", err);
        setError("Erro ao processar imagem. Tente outro arquivo.");
      }
    }
  };

  const handleLayerUpdate = useCallback((layers: any[]) => {
    setPersistentLayers(prev => {
      if (!editingImage) return prev;
      return { ...prev, [editingImage.id]: layers };
    });
  }, [editingImage]);

  const handleGenerate = async () => {
    if (!config.productDescription && !uploadedImage && !productImage && !config.copyText && !config.useAiAvatar) {
      setError("Briefing incompleto: descreva o objetivo ou insira o texto da arte.");
      return;
    }

    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsGenerating(true);
    // CLEAR PERSISTENCE
    setPersistentLayers({});
    setError(null);
    setIsQuotaError(false);
    setResults([]);
    setSelectedImage(null);
    setActivePulseStep(null);
    try {
      const generated = await generateStudioCreative({
        ...config,
        designCount: config.designCount,
        isEditableMode
      }, uploadedImage, studioRefImage, productImage, stickerImage, customModelImage, apiKey || undefined, mockupReferenceImage);

      // Inject Layout Mode Metadata
      const resultsWithMeta = generated.map(img => ({
        ...img,
        layoutMode: config.useBoxLayout ? 'box' : 'default' as 'box' | 'default'
      }));

      setResults(resultsWithMeta);
    } catch (err: any) {
      console.error("Critical Generation Error:", err);
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API key not valid")) {
        setShowApiKeyModal(true);
        setIsGenerating(false);
        return;
      }
      const isQuota = err.message?.includes('429') || err.message?.includes('quota');
      setIsQuotaError(isQuota);
      setError(isQuota
        ? "Limite de Uso Atingido. A conta compartilhada atingiu o limite. Conecte sua própria chave API para continuar."
        : (err.message || "Erro desconhecido na engine neural. Tente novamente.")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshVariation = async (variationId: string) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setRefreshingId(variationId);
    setError(null);
    setIsQuotaError(false);

    try {
      const singleVariation = await generateStudioCreative(config, uploadedImage, studioRefImage, productImage, stickerImage, customModelImage, apiKey || undefined);
      const newImage = singleVariation[0];
      setResults(prev => prev.map(res =>
        res.id === variationId ? { ...res, url: newImage.url } : res
      ));
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API key not valid")) {
        setShowApiKeyModal(true);
        setRefreshingId(null);
        return;
      }
      const isQuota = err.message?.includes('429') || err.message?.includes('quota');
      setIsQuotaError(isQuota);
      setError(isQuota
        ? "Cota Excedida. Use sua chave API própria para prioridade."
        : (err.message || "Erro ao atualizar esta variação.")
      );
    } finally {
      setRefreshingId(null);
    }
  };

  const handleUpdateImage = (editedUrl: string, backgroundCleanUrl?: string) => {
    if (editingImage) {
      setResults(prev => prev.map(res =>
        res.id === editingImage.id ? {
          ...res,
          url: editedUrl,
          // Update clean background if provided (Magic Edit), else keep existing clean background
          originalUrl: backgroundCleanUrl || res.originalUrl || res.url
        } : res
      ));
      if (selectedImage?.id === editingImage.id) {
        setSelectedImage(prev => prev ? { ...prev, url: editedUrl } : null);
      }
      setEditingImage(null);
    }
  };

  const handleAnimateMockup = async (image: GeneratedImage) => {
    // Check quota/key (Mock check)
    // Check quota/key (Mock check)
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    // Toggle the video preview on
    setActiveVideos(prev => ({ ...prev, [image.id]: true }));

    // Scroll to the preview
    setTimeout(() => {
      document.getElementById(`video-${image.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // ... (keeping other functions)

  // IN THE RENDER LOOP (Replace the button area and add preview)


  // Exports the image as a PDF that can be opened in Canva with editable layers
  const exportToPDF = async (image: GeneratedImage) => {
    try {
      // Determine PDF dimensions based on aspect ratio (in mm)
      let pdfWidth = 210; // A4 width
      let pdfHeight = 210; // Square default
      let orientation: 'portrait' | 'landscape' = 'portrait';

      switch (config.aspectRatio) {
        case AspectRatio.SQUARE: // 1:1
          pdfWidth = 200;
          pdfHeight = 200;
          break;
        case AspectRatio.PORTRAIT_3_4: // 3:4
          pdfWidth = 150;
          pdfHeight = 200;
          break;
        case AspectRatio.STORY_9_16: // 9:16
          pdfWidth = 112.5;
          pdfHeight = 200;
          break;
        case AspectRatio.LANDSCAPE_16_9: // 16:9
          pdfWidth = 200;
          pdfHeight = 112.5;
          orientation = 'landscape';
          break;
      }

      // Create PDF with custom dimensions
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      // Use originalUrl (clean background without baked text) if available, otherwise use current url
      const backgroundUrl = image.originalUrl || image.url;
      pdf.addImage(backgroundUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Add text layers from persistentLayers as editable PDF text
      let layers = persistentLayers[image.id] || [];

      // If no layers but copyText exists, create a default text layer
      if (layers.length === 0 && config.copyText) {
        layers = [{
          type: 'text',
          text: config.copyText,
          position: { x: 50, y: 50 },
          fontSize: 48,
          color: '#ffffff',
          fontFamily: 'Inter',
          textAlign: 'center',
          maxWidth: 80
        }];
      }

      layers.forEach((layer: any) => {
        if (layer.type === 'text' && layer.text) {
          // Convert percentage position to mm
          const xMm = (layer.position.x / 100) * pdfWidth;
          const yMm = (layer.position.y / 100) * pdfHeight;

          // Set font size (convert from px approximation to pt)
          const fontSizePt = Math.round((layer.fontSize || 48) * 0.35);
          pdf.setFontSize(fontSizePt);

          // Set text color
          if (layer.color) {
            // Parse hex color to RGB
            const hex = layer.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            pdf.setTextColor(r, g, b);
          } else {
            pdf.setTextColor(255, 255, 255);
          }

          // Add text with center alignment
          pdf.text(layer.text, xMm, yMm, { align: 'center' });
        }
      });

      // Download the PDF
      pdf.save(`agencia-ia-studio-v${image.variation || 1}.pdf`);
      // Show instructions
      alert('PDF com camadas editáveis baixado!\\n\\n1. Abra o Canva → Criar design → Importar arquivo\\n2. Selecione o PDF baixado\\n3. Os textos serão camadas editáveis no Canva!');

      // Also open Canva
      window.open('https://www.canva.com/', '_blank');

    } catch (err: any) { // Changed 'error' to 'err: any' for consistency and type safety
      console.error('PDF Export failed:', err); // Changed message
      alert('Erro ao gerar PDF. Tente novamente.'); // Kept original alert message
    }
  };

  // Removed PPT generation function


  // Opens Canva editor directly with the correct dimensions
  const openInCanva = () => {
    if (selectedImage) {
      exportToPDF(selectedImage);
    } else {
      // Fallback: just open Canva
      window.open('https://www.canva.com/', '_blank');
    }
  };

  const downloadImageDirectly = (url: string, variationIndex?: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `agencia-ia-studio-v${variationIndex || 1}.png`;
    link.click();
  };

  const downloadPreview = (image: GeneratedImage) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous"; // Allow cross-origin if needed

    img.onload = () => {
      // 1. Resize for Low Res (Max 800px width)
      const maxWidth = 800;
      const scale = maxWidth / img.width;
      const width = maxWidth;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      if (!ctx) return;

      // 2. Draw Image
      ctx.drawImage(img, 0, 0, width, height);

      // 3. Add Watermark
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 4); // Diagonal
      ctx.font = "bold 48px Inter, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((t.main as any).preview_watermark || "PRÉVIA - AGÊNCIA IA", 0, 0);

      // Repeat watermark for better coverage
      ctx.font = "bold 24px Inter, sans-serif";
      ctx.fillText((t.main as any).preview_watermark || "PRÉVIA", 0, -100);
      ctx.fillText((t.main as any).preview_watermark || "PRÉVIA", 0, 100);
      ctx.restore();

      // 4. Export and Download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Low quality JPEG
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `PREVIA_CLIENTE_v${image.variation}.jpg`;
      link.click();
    };

    img.src = image.url;
  };

  const isStudioMode = config.type === CreationType.STUDIO_PHOTO;
  const isMascotMode = config.type === CreationType.MASCOT;
  const isMockupMode = config.type === CreationType.MOCKUP;
  const isCreativeBackground = config.type === CreationType.CREATIVE_BACKGROUND;


  const isReady = (config.productDescription.length > 3 || uploadedImage || productImage || config.copyText!.length > 1 || config.useAiAvatar) ||
    (isMockupMode && uploadedImage) ||
    (isCreativeBackground && ((customModelImage || uploadedImage) && studioRefImage));


  const getAspectClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case AspectRatio.LANDSCAPE_16_9: return 'aspect-video';
      case AspectRatio.SQUARE: return 'aspect-square';
      case AspectRatio.STORY_9_16: return 'aspect-[9/16]';
      case AspectRatio.PORTRAIT_3_4: return 'aspect-[3/4]';
      case AspectRatio.CLASSIC_4_3: return 'aspect-[4/3]';
      default: return 'aspect-square';
    }
  };

  // SIMPLE URL-BASED ROUTING
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // CHECKOUT ROUTES (accessible without auth)
  if (currentPath === '/checkout' || currentPath === '/checkout/') {
    return <CheckoutPage onBack={() => navigateTo('/')} />;
  }

  if (currentPath === '/checkout/success' || currentPath.includes('collection_status=approved')) {
    return <CheckoutSuccess onGoToLogin={() => navigateTo('/')} />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <AuthScreen onLogin={() => { }} />;
  }

  return (
    <div className="flex flex-row-reverse h-screen overflow-hidden text-white/90 selection:bg-indigo-500/40 mobile-stack">
      {/* SIDEBAR */}


      {/* MAIN VIEWPORT */}
      < main className="flex-1 relative flex flex-col bg-transparent overflow-hidden mobile-main" >
        <div className={`w-full flex-shrink-0 border-b border-white/10 bg-gradient-to-r from-indigo-950/40 via-[#0a0a0f]/95 to-black/90 backdrop-blur-3xl z-30 transition-all duration-700 ease-in-out relative overflow-hidden ${isStep01Collapsed ? 'h-24 p-3' : 'p-6'}`}>
          {isStep01Collapsed ? (
            <div className="h-full flex items-center justify-between px-8 animate-in fade-in duration-500">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsStep01Collapsed(false)} className="w-10 h-10 rounded-full bg-indigo-600 border border-indigo-400/40 flex items-center justify-center text-white font-black text-sm shadow-lg hover:scale-105 transition-all">01</button>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">{t.main.motor_active}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">{config.type} <div className="w-1 h-1 rounded-full bg-white/20"></div> {config.aspectRatio}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setIsStep01Collapsed(false)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3">{t.main.configurations} <ChevronDown size={14} /></button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 md:gap-10 items-start">
              <div className="flex-shrink-0 flex items-center gap-6 px-4 md:px-8 border-b md:border-b-0 md:border-r border-white/10 py-2 w-full md:w-auto justify-between md:justify-start">
                <button onClick={() => setIsStep01Collapsed(!isStep01Collapsed)} className="w-16 h-16 rounded-full bg-indigo-600 border-4 border-indigo-400/30 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:scale-105 transition-transform">01</button>
                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white/80 leading-none">{t.main.step01_label}</p>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 animate-pulse">{t.main.step01_title}</h4>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                {/* Botão para fechar/recolher manual quando expandido */}
                <div className="flex justify-end pr-2 gap-4 items-center">
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    {(['pt', 'en', 'es', 'fr', 'it'] as Language[]).map((lang) => {
                      const flags: Record<string, string> = {
                        pt: 'https://flagcdn.com/w40/br.png',
                        en: 'https://flagcdn.com/w40/us.png',
                        es: 'https://flagcdn.com/w40/es.png',
                        fr: 'https://flagcdn.com/w40/fr.png',
                        it: 'https://flagcdn.com/w40/it.png'
                      };
                      return (
                        <button key={lang} onClick={() => setLanguage(lang)} className={`w-8 h-8 flex items-center justify-center rounded overflow-hidden transition-all ${language === lang ? 'bg-white/10 grayscale-0 scale-110 ring-2 ring-indigo-500/50' : 'grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}>
                          <img src={flags[lang]} alt={lang} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end pr-2">
                    <button
                      onClick={() => setIsStep01Collapsed(true)}
                      className="px-5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-2 group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.main.collapse_panel}</span>
                      <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 w-full max-w-[1400px]">
                  {Object.values(CreationType).map((type) => {
                    const isActive = config.type === type;
                    return (
                      <button key={type} onClick={() => handleTypeChange(type)} className={`flex items-center gap-3 md:gap-4 px-3 py-3 md:px-6 md:py-5 rounded-xl md:rounded-2xl border transition-all duration-300 ${isActive ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_25px_rgba(99,102,241,0.25)]' : 'bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/[0.08] hover:border-white/20'}`}>
                        <div className={`flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-white/10'}`}>{getTypeIcon(type)}</div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] truncate text-left leading-tight">{type}</span>
                      </button>
                    );
                  })}
                </div>
                {showRatioSelector && (
                  <div className="flex flex-col gap-5 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 text-indigo-400/80"><Maximize2 size={14} /><span className="text-[10px] font-black uppercase tracking-[0.4em]">{t.main.select_format}</span></div>
                      <div className="h-px flex-1 bg-white/10 opacity-30"></div>
                    </div>
                    {/* Format Selector with Restrictions */}
                    <div className="flex gap-3 flex-wrap">
                      {Object.values(AspectRatio)
                        .filter(ratio => {
                          // Social/UGC/Ad Restriction: Only 1:1, 3:4, 9:16
                          if ([CreationType.SOCIAL_POST].includes(config.type)) {
                            return [AspectRatio.SQUARE, AspectRatio.PORTRAIT_3_4, AspectRatio.STORY_9_16].includes(ratio);
                          }
                          // YouTube Restriction: Only 16:9
                          if (config.type === CreationType.YOUTUBE_THUMB) return ratio === AspectRatio.LANDSCAPE_16_9;


                          return true;
                        })
                        .map((ratio) => (
                          <button key={ratio} onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))} className={`px-7 py-4 rounded-xl border text-[11px] font-black tracking-[0.3em] transition-all min-w-[100px] ${config.aspectRatio === ratio ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-active-glow' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'}`}>{ratio}</button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Color Palette Selector - Visual - HIDDEN IN STUDIO MODE */}

              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-12 scrollbar-hide bg-[#050505]/20 relative mobile-main mobile-padding">
          {error && (
            <div className="mb-12 p-8 glass-panel border-red-500/20 rounded-[2.5rem] flex items-start gap-5 text-red-400 max-w-2xl mx-auto animate-in slide-in-from-top-4 duration-500">
              <div className="p-3 bg-red-500/10 rounded-2xl"><AlertCircle size={28} /></div>
              <div className="flex-1">
                <p className="font-black text-lg uppercase tracking-widest">{t.alerts.system_alert}</p>
                <p className="text-sm opacity-70 mt-1 leading-relaxed">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
          )}

          {!isGenerating && results.length === 0 && !error && !selectedImage && (
            <div className="flex flex-col items-center min-h-[70vh] animate-in fade-in duration-700">

              {isStudioMode ? (
                /* CURADORIA DE ESTILOS VISUAL */
                <div className="w-full max-w-6xl space-y-12 pb-20">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Step 02</div>
                    <h3 className="text-4xl font-black tracking-tight text-white uppercase">{t.main.curation_title}</h3>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">{t.main.curation_subtitle}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {Object.values(StudioStyle).map((style) => {
                      const meta = StudioStyleMeta[style];
                      const isActive = config.studioStyle === style;
                      return (
                        <button
                          key={style}
                          onClick={() => setConfig(prev => ({ ...prev, studioStyle: style }))}
                          className={`group relative flex flex-col items-center justify-end p-6 aspect-[3/4] rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${isActive ? 'border-indigo-500 active-glow' : 'border-white/5 hover:border-white/20 bg-white/[0.02]'}`}
                        >
                          {/* Background Reference Image */}
                          <img
                            src={meta.imageUrl}
                            alt={style}
                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${isActive ? 'scale-105 grayscale-0' : 'grayscale group-hover:grayscale-0 scale-100 group-hover:scale-105'}`}
                          />
                          {/* Overlay Gradient */}
                          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity`}></div>

                          {isActive && (
                            <div className="absolute top-6 right-6 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
                              <Check size={16} strokeWidth={4} />
                            </div>
                          )}
                          <div className="relative z-10 text-center space-y-1">
                            <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white drop-shadow-lg">{style}</p>
                            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90 transition-colors drop-shadow-md">{meta.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* UPLOAD HUB EMBAIXO DA CURADORIA PARA STUDIO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
                    <div className="relative group">
                      <input type="file" id="studio-main-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'subject')} />
                      <label htmlFor="studio-main-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[240px] ${uploadedImage ? 'bg-indigo-600/5 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {uploadedImage ? (
                          <img src={uploadedImage} className="w-full h-full object-contain rounded-2xl" />
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/30 group-hover:text-white transition-all"><ShoppingBag size={24} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{t.main.upload_your_photo}</p>
                            <p className="text-[8px] text-white/20 mt-1 font-bold uppercase tracking-widest text-center">{t.main.upload_product_face}</p>
                          </>
                        )}
                      </label>
                    </div>
                    <div className="relative group">
                      <input type="file" id="studio-ref-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'reference')} />
                      <label htmlFor="studio-ref-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[240px] ${studioRefImage ? 'bg-pink-600/5 border-pink-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {studioRefImage ? (
                          <img src={studioRefImage} className="w-full h-full object-contain rounded-2xl" />
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/30 group-hover:text-white transition-all"><Palette size={24} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{t.main.upload_style_ref}</p>
                            <p className="text-[8px] text-white/20 mt-1 font-bold uppercase tracking-widest text-center">{t.main.upload_guide_image}</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              ) : isMascotMode ? (
                /* MASCOT MODE MAIN UI */
                <div className="w-full max-w-6xl space-y-12 pb-20">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center px-4 py-1.5 bg-orange-600/10 border border-orange-500/20 rounded-full text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] mb-4">Step 02</div>
                    <h3 className="text-4xl font-black tracking-tight text-white uppercase">{t.main.curation_title}</h3>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">{t.main.curation_subtitle}</p>
                  </div>

                  {/* MASCOT STYLE GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {Object.values(MascotStyle).map((style) => {
                      const meta = MascotStyleMeta[style];
                      const isActive = config.mascotStyle === style;
                      return (
                        <button
                          key={style}
                          onClick={() => setConfig(prev => ({ ...prev, mascotStyle: style }))}
                          className={`group relative flex flex-col items-center justify-end p-6 aspect-square rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${isActive ? 'border-orange-500 active-glow' : 'border-white/5 hover:border-white/20 bg-white/[0.02]'}`}
                        >
                          <img
                            src={meta.imageUrl}
                            alt={style}
                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${isActive ? 'scale-105 grayscale-0' : 'grayscale group-hover:grayscale-0 scale-100 group-hover:scale-105'}`}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity`}></div>
                          {isActive && (
                            <div className="absolute top-6 right-6 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
                              <Check size={16} strokeWidth={4} />
                            </div>
                          )}
                          <div className="relative z-10 text-center space-y-1">
                            <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white drop-shadow-lg">{style}</p>
                            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90 transition-colors drop-shadow-md">{meta.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* MASCOT UPLOAD HUB */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                    {/* CLIENT PHOTO 1 (PRIMARY) */}
                    <div className="relative group">
                      <input type="file" id="mascot-client-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'customModel')} />
                      <label htmlFor="mascot-client-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[240px] ${customModelImage ? 'bg-orange-600/5 border-orange-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {customModelImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={customModelImage} className="w-full h-full object-contain rounded-2xl" />
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center shadow-lg"><Check size={16} /></div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/30 group-hover:text-white transition-all"><User size={24} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Foto Principal</p>
                            <p className="text-[8px] text-white/20 mt-1 font-bold uppercase tracking-widest text-center">Rosto do Cliente</p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* CLIENT PHOTO 2 (SECONDARY) */}
                    <div className="relative group">
                      <input type="file" id="mascot-client-upload-2" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'subject')} />
                      <label htmlFor="mascot-client-upload-2" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[240px] ${uploadedImage ? 'bg-orange-600/5 border-orange-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {uploadedImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={uploadedImage} className="w-full h-full object-contain rounded-2xl" />
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center shadow-lg"><Check size={16} /></div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/30 group-hover:text-white transition-all"><Camera size={24} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Foto Extra</p>
                            <p className="text-[8px] text-white/20 mt-1 font-bold uppercase tracking-widest text-center">Mais Detalhes (Opcional)</p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* STYLE REFERENCE */}
                    <div className="relative group">
                      <input type="file" id="mascot-ref-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'reference')} />
                      <label htmlFor="mascot-ref-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[240px] ${studioRefImage ? 'bg-pink-600/5 border-pink-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {studioRefImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={studioRefImage} className="w-full h-full object-contain rounded-2xl" />
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center shadow-lg"><Check size={16} /></div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white/30 group-hover:text-white transition-all"><Palette size={24} /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Referência Visual</p>
                            <p className="text-[8px] text-white/20 mt-1 font-bold uppercase tracking-widest text-center">Guia de Estilo (Opcional)</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              ) : isMockupMode ? (
                /* MOCKUP MODE UPLOAD HUB */
                <div className="w-full max-w-4xl space-y-12 pb-20">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center px-4 py-1.5 bg-emerald-600/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-4">Step 03</div>
                    <h3 className="text-4xl font-black tracking-tight text-white uppercase">{t.main.upload_your_photo}</h3>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">Envie o design para aplicar no mockup</p>
                  </div>

                  <div className="grid grid-cols-1 gap-8 max-w-md mx-auto">
                    <div className="relative group">
                      <input type="file" id="mockup-design-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'subject')} />
                      <label htmlFor="mockup-design-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[320px] ${uploadedImage ? 'bg-emerald-600/5 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {uploadedImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={uploadedImage} className="w-full h-full object-contain rounded-2xl shadow-2xl" />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in"><Check size={20} strokeWidth={3} /></div>
                            <div className="mt-4 px-4 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30 text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                              Arte Carregada
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white/30 group-hover:text-white transition-all group-hover:scale-110"><ImageLucide size={32} /></div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Carregar Arte / Logo</p>
                            <p className="text-[9px] text-white/20 mt-2 font-bold uppercase tracking-widest text-center max-w-[200px]">PNG ou JPG de alta qualidade</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              ) : isCreativeBackground ? (
                /* CREATIVE BACKGROUND UPLOAD HUB */
                <div className="w-full max-w-5xl space-y-12 pb-20">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center px-4 py-1.5 bg-cyan-600/10 border border-cyan-500/20 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-4">Step 03</div>
                    <h3 className="text-4xl font-black tracking-tight text-white uppercase">Criação de Fundo Criativo</h3>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">Combine seu produto/modelo com a identidade visual da sua marca</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* 1. MODEL/PRODUCT UPLOAD */}
                    <div className="relative group">
                      <input type="file" id="creative-model-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'customModel')} />
                      <label htmlFor="creative-model-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[320px] ${customModelImage ? 'bg-cyan-600/5 border-cyan-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {customModelImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={customModelImage} className="w-full h-full object-contain rounded-2xl" />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center shadow-lg"><Check size={20} /></div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-cyan-400">Modelo Carregado</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white/30 group-hover:scale-110 group-hover:text-white transition-all"><User size={32} /></div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Foto do Modelo</p>
                            <p className="text-[9px] text-white/20 mt-2 font-bold uppercase tracking-widest text-center">Pessoa ou Produto Principal</p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* 2. STYLE/LOGO UPLOAD */}
                    <div className="relative group">
                      <input type="file" id="creative-ref-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'reference')} />
                      <label htmlFor="creative-ref-upload" className={`flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer h-[320px] ${studioRefImage ? 'bg-pink-600/5 border-pink-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {studioRefImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={studioRefImage} className="w-full h-full object-contain rounded-2xl" />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center shadow-lg"><Check size={20} /></div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-pink-400">Referência Carregada</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white/30 group-hover:scale-110 group-hover:text-white transition-all"><Palette size={32} /></div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Logo ou Padrão</p>
                            <p className="text-[9px] text-white/20 mt-2 font-bold uppercase tracking-widest text-center">Para extrair cores e formas</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* BRAND COLORS SECTION */}
                  <div className="flex flex-col items-center justify-center space-y-6 pt-8 border-t border-white/5 w-full max-w-2xl mx-auto animate-in fade-in duration-500">
                    <div className="text-center space-y-2">
                      <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">Cores da Marca (Hex)</h4>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Insira os códigos hex para fidelidade de cor</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                      {(config.brandColors || ['#000000', '#FFFFFF']).map((color, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 animate-in zoom-in duration-300">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...(config.brandColors || ['#000000', '#FFFFFF'])];
                              newColors[index] = e.target.value;
                              setConfig(prev => ({ ...prev, brandColors: newColors }));
                            }}
                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...(config.brandColors || ['#000000', '#FFFFFF'])];
                              newColors[index] = e.target.value;
                              setConfig(prev => ({ ...prev, brandColors: newColors }));
                            }}
                            className="w-24 bg-transparent text-white font-mono text-xs uppercase focus:outline-none"
                            placeholder="#000000"
                          />
                          {/* Only allow removing if we have more than 2 colors */}
                          {(config.brandColors || []).length > 2 && (
                            <button
                              onClick={() => {
                                const newColors = [...(config.brandColors || [])];
                                newColors.splice(index, 1);
                                setConfig(prev => ({ ...prev, brandColors: newColors }));
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Color Button */}
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, brandColors: [...(prev.brandColors || ['#000000', '#FFFFFF']), '#000000'] }))}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-indigo-600 hover:text-white rounded-xl border border-white/10 border-dashed transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* UPLOAD HUB CENTRAL PARA OUTROS MODOS */
                <div className="w-full max-w-[1400px] space-y-12">
                  <div className="text-center space-y-4 mb-16">
                    <h3 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-white/20 bg-clip-text text-transparent uppercase">{t.main.welcome_title}</h3>
                    <p className="text-white/30 text-lg font-medium tracking-wide">{t.main.welcome_subtitle}</p>
                  </div>
                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
                    <div className="relative group">
                      <input type="file" id="center-main-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'product')} />
                      <label htmlFor="center-main-upload" className={`flex flex-col items-center justify-center p-10 rounded-[3.5rem] border-2 border-dashed transition-all cursor-pointer h-[320px] ${productImage ? 'bg-indigo-600/5 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {productImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={productImage} className="w-full h-full object-contain rounded-3xl" />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg"><Plus className="rotate-45" size={20} /></div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-400">{t.main.loaded_product}</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white/30 group-hover:scale-110 group-hover:text-white transition-all"><ShoppingBag size={32} /></div>
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-white">{t.main.upload_product_photo}</p>
                            <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">{t.main.upload_highlight_product}</p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* CUSTOM MODEL UPLOAD - NO MEIO */}
                    <div className="relative group">
                      <input type="file" id="center-model-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'customModel')} />
                      <label htmlFor="center-model-upload" className={`flex flex-col items-center justify-center p-10 rounded-[3.5rem] border-2 border-dashed transition-all cursor-pointer h-[320px] ${customModelImage ? 'bg-amber-600/5 border-amber-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {customModelImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={customModelImage} className="w-full h-full object-contain rounded-3xl" />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center shadow-lg"><Check size={20} /></div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-amber-400">{t.main.loaded_model}</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white/30 group-hover:scale-110 group-hover:text-white transition-all"><UserCheck size={32} /></div>
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-white">{t.main.upload_custom_model}</p>
                            <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">{t.main.upload_your_model}</p>
                          </>
                        )}
                      </label>
                    </div>



                    <div className="relative group">
                      <input type="file" id="center-ref-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'reference')} />
                      <label htmlFor="center-ref-upload" className={`flex flex-col items-center justify-center p-10 rounded-[3.5rem] border-2 border-dashed transition-all cursor-pointer h-[320px] ${studioRefImage ? 'bg-pink-600/5 border-pink-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                        {studioRefImage ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={studioRefImage} className="w-full h-full object-contain rounded-3xl" />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center shadow-lg"><Plus className="rotate-45" size={20} /></div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-pink-400">{t.main.active_style_ref}</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-white/30 group-hover:scale-110 group-hover:text-white transition-all"><Palette size={32} /></div>
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-white">{t.main.upload_design_ref}</p>
                            <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">{t.main.upload_guide_ai}</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>


                </div>
              )
              }
            </div >
          )}

          {
            isGenerating && (
              <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-48 h-48 border-[1px] border-white/5 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <div className="absolute inset-0 w-48 h-48 border-t-[1px] border-indigo-500 rounded-full animate-[spin_2s_linear_infinite]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-white tracking-[0.2em] uppercase animate-pulse">{t.main.designing_title}</span>
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{t.main.accelerating_network}</p>
              </div>
            )
          }

          {
            results.length > 0 && !isGenerating && !selectedImage && (
              <div className="space-y-16 max-w-[1400px] mx-auto animate-in slide-in-from-bottom-8 duration-700 pb-20">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black uppercase tracking-widest text-white">{t.main.results_title}</h3>
                  <div className="flex items-center gap-4">

                    <button
                      onClick={handleReset}
                      className="px-8 py-3 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-3"
                    >
                      <RotateCw size={18} />
                      {t.main.new_creation}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {results.map((variation) => (
                    <div key={variation.id} className="space-y-6">
                      <div className="flex items-center gap-6"><div className="px-6 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-[12px] font-black text-indigo-400 uppercase tracking-[0.4em]">Design {variation.variation}</div><div className="h-px flex-1 bg-white/5"></div></div>
                      <div className="group relative glass-panel rounded-3xl overflow-hidden border-white/5 hover:border-indigo-500/50 transition-all duration-500 shadow-2xl bg-zinc-900 min-h-[400px] flex items-center justify-center">
                        {refreshingId === variation.id ? (
                          <Loader2 className="animate-spin text-indigo-500" size={40} />
                        ) : (
                          <>
                            <div className={`w-full h-full ${getAspectClass(config.aspectRatio)} overflow-hidden relative`}>
                              <img src={variation.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />

                              {/* LIVE TEXT PREVIEW OVERLAY */}
                              {!isStudioMode && config.copyText && config.useBoxLayout && (
                                <div className="absolute inset-0 flex items-start justify-center pt-20 p-8 pointer-events-none z-10 transition-opacity duration-500 animate-in fade-in">
                                  <h2
                                    className="text-white font-bold text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                                    style={{
                                      fontSize: 'clamp(24px, 5vw, 48px)',
                                      fontFamily: 'Inter',
                                      lineHeight: 1.2,
                                      whiteSpace: 'pre-wrap'
                                    }}
                                  >
                                    {config.copyText}
                                  </h2>
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300 backdrop-blur-[2px]">
                              <button onClick={() => downloadPreview(variation)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl hover:scale-110 active:scale-95 transition-all" title="Baixar Prévia (Cliente)"><Eye size={24} /></button>
                              <button onClick={() => downloadImageDirectly(variation.url, variation.variation)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl hover:scale-110 active:scale-95 transition-all" title="Baixar PNG"><ImageIcon size={24} /></button>
                              <button onClick={() => setEditingImage(variation)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl hover:scale-110 active:scale-95 transition-all" title="Editar Texto"><Edit3 size={24} /></button>

                              <button onClick={() => handleRefreshVariation(variation.id)} className="w-14 h-14 bg-[#ec4899] rounded-2xl flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all" title="Regenerar"><RotateCw size={24} /></button>
                            </div>

                            {/* VIDEO ANIMATION BUTTON */}
                          </>
                        )}
                      </div>


                    </div>
                  ))}
                </div>
              </div>
            )}




          {
            selectedImage && (
              <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in zoom-in-95 duration-500">
                <div className="h-24 px-12 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-3xl">
                  <button onClick={() => setSelectedImage(null)} className="p-4 hover:bg-white/5 rounded-2xl transition-all text-white/30 hover:text-white flex items-center gap-3"><X size={24} /> Sair</button>
                  <div className="flex items-center gap-4">
                    {isEditableMode && (
                      <div className="flex items-center gap-4 mr-8 p-2 bg-white/5 rounded-xl border border-white/10">
                        <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none" />
                        <input type="range" min="20" max="120" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-24 accent-indigo-500" />
                        <div className="flex flex-col gap-1">
                          <button onClick={() => setTextPosition(p => ({ ...p, y: p.y - 5 }))}><Move size={14} className="text-white/50 hover:text-white" /></button>
                          <button onClick={() => setTextPosition(p => ({ ...p, y: p.y + 5 }))}><Move size={14} className="text-white/50 hover:text-white rotate-180" /></button>
                        </div>
                      </div>
                    )}
                    <button onClick={() => downloadPreview(selectedImage)} className="px-6 py-4 bg-white/5 text-white/60 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white/10 hover:text-white transition-all"><Eye size={18} /> PRÉVIA</button>
                    <button onClick={() => downloadImageDirectly(selectedImage.url, selectedImage.variation)} className="px-8 py-4 bg-white text-black rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] flex items-center gap-4 hover:scale-105 transition-all"><Download size={22} /> PNG</button>

                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-12 overflow-hidden bg-[#050505]">
                  <div className={`${getAspectClass(config.aspectRatio)} max-h-full rounded-[4rem] overflow-hidden shadow-2xl border border-white/10 relative`}>
                    <img src={selectedImage.url} className="w-full h-full object-contain" />

                    {isEditableMode && config.copyText && (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${textPosition.y}%`,
                          left: `${textPosition.x}%`,
                          transform: 'translate(-50%, -50%)',
                          color: textColor,
                          fontSize: `${fontSize}px`,
                          lineHeight: 1.1,
                          textShadow: '0px 10px 20px rgba(0,0,0,0.5)'
                        }}
                        className="font-black uppercase text-center tracking-tighter cursor-move select-none z-20 whitespace-pre-wrap"
                      >
                        {config.copyText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        </div >
      </main >

      {/* SIDEBAR (Moved after Main for Mobile Order 1-2-3) */}
      <aside className="w-[340px] flex-shrink-0 border-r border-white/5 bg-[#080808]/95 backdrop-blur-xl flex flex-col z-20 tech-corners mobile-sidebar tablet-sidebar">
        <header className="p-7 flex items-center justify-between border-b border-white/5 bg-black/20 mobile-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">AGENCIA <span className="text-indigo-500">IA</span></h1>
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] mt-1.5">{t.sidebar.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                title={t.sidebar.reset_tooltip}
                className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <RotateCw size={18} />
              </button>
              <button
                onClick={handleOpenApiKeyDialog}
                title={t.sidebar.api_tooltip}
                className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <Key size={18} />
              </button>
            </div>
          </div>
        </header >

        <div className="flex-1 overflow-y-auto px-7 py-8 space-y-12 scrollbar-hide">
          <section className="space-y-6">
            <header className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-600 to-pink-500 flex items-center justify-center text-xl font-black text-white shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all ${activePulseStep === 2 ? 'animate-pulse-ring' : ''}`}>02</div>
              <div className="space-y-0.5">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-pink-400">
                  {isStudioMode ? t.sidebar.step02_studio_title : (isMascotMode ? t.sidebar.step02_mascot_title : (isMockupMode ? 'ESTILO DO MOCKUP' : (isCreativeBackground ? 'REFERÊNCIA VISUAL' : t.sidebar.step02_title)))}
                </h2>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">{t.sidebar.step02_subtitle}</p>
              </div>
            </header>


            {/* Show notice when reference image overrides presets */}
            {(studioRefImage && !isCreativeBackground) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 text-center">
                  ⚡ Imagem de referência ativa - presets desativados
                </p>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-2 ${(studioRefImage && !isCreativeBackground) ? 'opacity-30 pointer-events-none' : ''}`}>
              {isCreativeBackground ? (
                <div className="col-span-2 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400">MODO CRIATIVO ATIVO</p>
                  <p className="text-[9px] text-white/40 leading-relaxed">
                    Neste modo, o estilo será definido 100% pela imagem de referência (Logo ou Grafismo) que você enviar.
                  </p>
                </div>
              ) : isStudioMode ? (
                Object.values(StudioStyle).map((style) => (
                  <button
                    key={style}
                    onClick={() => { setConfig(prev => ({ ...prev, studioStyle: style })); setActivePulseStep(3); }}
                    disabled={!!studioRefImage}
                    className={`px-3 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${config.studioStyle === style ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'}`}
                  >
                    {style}
                  </button>
                ))
              ) : isMascotMode ? (
                // MASCOT STYLE SELECTOR
                Object.values(MascotStyle).map((style) => {
                  const meta = MascotStyleMeta[style];
                  const isActive = config.mascotStyle === style;
                  return (
                    <button
                      key={style}
                      onClick={() => { setConfig(prev => ({ ...prev, mascotStyle: style })); setActivePulseStep(3); }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all overflow-hidden aspect-square ${isActive ? `bg-orange-500/20 border-orange-500/50 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]` : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                    >
                      <img src={meta.imageUrl} className={`absolute inset-0 w-full h-full object-cover transition-all opacity-40 group-hover:opacity-60 ${isActive ? 'opacity-60 scale-110' : 'grayscale'}`} />
                      <div className="absolute inset-0 bg-black/40"></div>
                      <span className="relative z-10 text-[9px] font-black uppercase text-center leading-tight">{style}</span>
                    </button> // End Mascot Button
                  );
                })
              ) : isMockupMode ? (
                // MOCKUP STYLE SELECTOR
                Object.values(MockupStyle).map((style) => {
                  const meta = MockupStyleMeta[style];
                  const isActive = config.mockupStyle === style;
                  return (
                    <button
                      key={style}
                      onClick={() => { setConfig(prev => ({ ...prev, mockupStyle: style })); setActivePulseStep(3); }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all overflow-hidden aspect-square ${isActive ? `bg-emerald-500/20 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]` : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                    >
                      <img src={meta.imageUrl} className={`absolute inset-0 w-full h-full object-cover transition-all opacity-40 group-hover:opacity-60 ${isActive ? 'opacity-60 scale-110' : 'grayscale'}`} />
                      <div className="absolute inset-0 bg-black/40"></div>
                      <span className="relative z-10 text-[9px] font-black uppercase text-center leading-tight">{style}</span>
                    </button>
                  );
                })
              ) : (
                Object.values(VisualStyle).map((style) => (
                  <button
                    key={style}
                    onClick={() => { setConfig(prev => ({ ...prev, style })); setActivePulseStep(3); }}
                    disabled={!!studioRefImage}
                    className={`px-3 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${config.style === style ? 'bg-pink-600/20 border-pink-500/50 text-white shadow-[0_0_15px_rgba(236,72,153,0.1)]' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'}`}
                  >
                    {style}
                  </button>
                ))
              )}
            </div>

            {/* MOCKUP REFERENCE IMAGE UPLOAD */}
            {isMockupMode && (
              <div className="mt-4 p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={16} className="text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Referência do Objeto (Opcional)
                  </span>
                </div>
                <p className="text-[9px] text-white/40 mb-3">
                  Envie uma foto do veículo/objeto exato que deseja usar. A IA copiará o modelo visual.
                </p>

                {mockupReferenceImage ? (
                  <div className="relative">
                    <img
                      src={mockupReferenceImage}
                      alt="Referência"
                      className="w-full h-24 object-contain rounded-xl border border-amber-500/30 bg-black/30"
                    />
                    <button
                      onClick={() => setMockupReferenceImage(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-400 transition-all"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-500/30 rounded-xl cursor-pointer hover:bg-amber-500/10 transition-all">
                    <Upload size={20} className="text-amber-400 mb-2" />
                    <span className="text-[9px] text-amber-400 font-bold">ENVIAR FOTO DO VEÍCULO/OBJETO</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'mockupReference')}
                    />
                  </label>
                )}
              </div>
            )}
          </section>

          <section className={`space-y-6 p-4 rounded-3xl border border-transparent transition-all ${activePulseStep === 3 ? 'animate-container-flash' : ''}`}>
            <header className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-xl font-black text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)]">03</div>
              <div className="space-y-0.5">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">{t.sidebar.step03_title}</h2>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">{t.sidebar.step03_subtitle}</p>
              </div>
            </header>

            <div className="space-y-4">



              {/* Avatar IA Toggle - Always Visible unless Custom Model is uploaded or Mascot Mode */}
              {!isMascotMode && !isMockupMode && !isCreativeBackground && (
                <div className={`flex items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5 ${customModelImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="flex items-center gap-3 flex-1">
                    <User size={18} className="text-indigo-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.sidebar.create_avatar}</span>
                      {uploadedImage && <span className="text-[8px] text-red-400 font-bold uppercase">{t.sidebar.avatar_disabled}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => !customModelImage && setConfig(prev => ({ ...prev, useAiAvatar: !prev.useAiAvatar }))}
                    disabled={!!customModelImage}
                    className={`w-12 h-6 rounded-full transition-all relative ${config.useAiAvatar && !customModelImage ? 'bg-indigo-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.useAiAvatar && !customModelImage ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              )}


              {/* GLOBAL MODEL SELECTOR - Visible if AI Avatar is ON */}
              {!isMascotMode && !isMockupMode && !isCreativeBackground && config.useAiAvatar && !customModelImage && (
                <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5 animate-in slide-in-from-top-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">{t.sidebar.ugc_model_label}</label>
                  <div className="flex flex-col gap-2">
                    {Object.values(UGCModel).map((model) => (
                      <button
                        key={model}
                        onClick={() => setConfig(prev => ({ ...prev, ugcModel: model }))}
                        className={`w-full py-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider text-left transition-all ${config.ugcModel === model ? 'bg-emerald-600 text-white shadow-lg' : 'bg-black/20 text-white/40 hover:bg-white/10 hover:text-white'}`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isStudioMode && !isMascotMode && !isMockupMode && !isCreativeBackground && (
                <>
                  {/* Social Class Selector - ONLY FOR UGC */}
                  {/* Social Class & Environment - ONLY FOR UGC */}
                  {config.style === VisualStyle.UGC_INSTAGRAM && (
                    <>
                      <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">{t.sidebar.social_class_label}</label>
                        <div className="flex flex-col gap-2">
                          {Object.values(SocialClass).map((cls) => (
                            <button
                              key={cls}
                              onClick={() => setConfig(prev => ({ ...prev, socialClass: cls }))}
                              className={`w-full py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-left transition-all ${config.socialClass === cls ? 'bg-pink-600 text-white shadow-lg' : 'bg-black/20 text-white/40 hover:bg-white/10 hover:text-white'}`}
                            >
                              {cls}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">{t.sidebar.ugc_environment_label}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.values(UGCEnvironment).map((env) => (
                            <button
                              key={env}
                              onClick={() => setConfig(prev => ({ ...prev, ugcEnvironment: env, customEnvironment: '' }))}
                              className={`w-full py-2 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center transition-all ${config.ugcEnvironment === env && !config.customEnvironment ? 'bg-cyan-600 text-white shadow-lg' : 'bg-black/20 text-white/40 hover:bg-white/10 hover:text-white'}`}
                            >
                              {env.split(' / ')[0]}
                            </button>
                          ))}
                        </div>
                        {/* Custom Environment Input */}
                        <input
                          type="text"
                          value={config.customEnvironment || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, customEnvironment: e.target.value, ugcEnvironment: undefined }))}
                          placeholder={t.sidebar.ugc_custom_env_placeholder}
                          className={`w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white focus:border-cyan-500 focus:bg-cyan-900/10 outline-none transition-all placeholder:text-white/20 ${config.customEnvironment ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : ''}`}
                        />
                      </div>


                    </>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{t.sidebar.headline_label}</label>
                      <p className="text-[9px] text-white/30">{t.sidebar.headline_desc}</p>
                    </div>
                    <textarea
                      value={config.copyText}
                      onChange={(e) => setConfig(prev => ({ ...prev, copyText: e.target.value }))}
                      placeholder={config.style === VisualStyle.UGC_INSTAGRAM ? t.sidebar.headline_placeholder_ugc : t.sidebar.headline_placeholder}
                      disabled={config.style === VisualStyle.UGC_INSTAGRAM}
                      rows={3}
                      className={`w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-white/20 font-medium resize-none ${config.style === VisualStyle.UGC_INSTAGRAM ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{t.sidebar.cta_label}</label>
                      <p className="text-[9px] text-white/30">{t.sidebar.cta_desc}</p>
                    </div>
                    <input
                      type="text"
                      value={config.ctaText}
                      onChange={(e) => setConfig(prev => ({ ...prev, ctaText: e.target.value }))}
                      placeholder={t.sidebar.cta_placeholder}
                      disabled={config.style === VisualStyle.UGC_INSTAGRAM}
                      className={`w-full bg-white/5 border border-white/5 rounded-xl p-4 text-xs font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-white/10 ${config.style === VisualStyle.UGC_INSTAGRAM ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>




                </>
              )}

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400">
                    {isStudioMode ? t.sidebar.briefing_label_studio : (isMascotMode ? t.sidebar.briefing_label_mascot : (isMockupMode ? 'INSTRUÇÃO EXTRA (OPCIONAL)' : (isCreativeBackground ? 'DETALHES DO BACKGROUND' : t.sidebar.briefing_label)))}
                  </label>
                  <p className="text-[9px] text-white/30">{t.sidebar.briefing_desc}</p>
                </div>
                <textarea
                  value={config.productDescription}
                  onChange={(e) => setConfig(prev => ({ ...prev, productDescription: e.target.value }))}
                  placeholder={isStudioMode ? t.sidebar.briefing_placeholder_studio : (isMascotMode ? t.sidebar.briefing_placeholder_mascot : (isMockupMode ? 'Descreva detalhes do acabamento, material ou iluminação...' : t.sidebar.briefing_placeholder))}
                  className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none placeholder:text-white/10 transition-all leading-relaxed resize-none shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">{t.sidebar.variations_label}</label>
                  <p className="text-[9px] text-white/30">{t.sidebar.variations_desc}</p>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => setConfig(prev => ({ ...prev, designCount: count }))}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${config.designCount === count ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10'}`}
                    >
                      {count} {count === 1 ? 'Opção' : 'Opções'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-white/5 bg-[#0a0a0a] relative">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !isReady}
            className={`w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all tech-corners active:scale-[0.98] ${isGenerating ? 'bg-white/5' : isReady ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-[0_20px_50px_rgba(79,70,229,0.4)] opacity-100 animate-pulse-glow' : 'bg-white/5 text-white/20 border border-white/5 opacity-50 cursor-not-allowed'}`}
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} fill={isReady ? "currentColor" : "none"} className={isReady ? "" : "opacity-10"} />}
            <span className="text-[11px] uppercase tracking-[0.3em] font-black">
              {isGenerating ? t.sidebar.processing : isCreativeBackground ? "GERAR ARTES CRIATIVAS" : t.sidebar.generate_btn}
            </span>
          </button>
        </div>
      </aside >

      {editingImage && (
        <TextEditor
          image={editingImage}
          aspectRatio={config.aspectRatio}
          initialLayers={persistentLayers[editingImage.id]}
          initialText={config.useBoxLayout ? config.copyText : ''} // Only inject text if it's meant to be editable (Box Mode)
          onClose={() => setEditingImage(null)}
          onSave={handleUpdateImage}
          onUpdate={handleLayerUpdate}
          onMagicEdit={async (prompt) => {
            if (!editingImage) return;
            if (!apiKey) {
              setShowApiKeyModal(true);
              return;
            }
            try {
              // Mock loading / toast here if needed, but TextEditor handles its own loading state
              const newImageUrl = await editGeneratedImage(editingImage.url, prompt, config.aspectRatio, apiKey);
              if (newImageUrl) {
                const updatedImage = { ...editingImage, url: newImageUrl };
                setResults(prev => prev.map(img => img.id === editingImage.id ? updatedImage : img));
                setEditingImage(updatedImage);
              }
            } catch (e: any) {
              console.error("Magic Edit Error", e);
              alert(`Erro na edição: ${e.message || "Erro desconhecido"}`);
            }
          }}
        />
      )}

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSave={handleSaveApiKey}
        onClose={() => setShowApiKeyModal(false)}
        isMandatory={!apiKey}
      />

    </div>
  );
};

export default App;

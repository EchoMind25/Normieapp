import { useState, useRef, useEffect, useCallback } from "react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { useQuery } from "@tanstack/react-query";
import Upscaler from "upscaler";
import { removeBackground } from "@imgly/background-removal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  Type,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Smile,
  Palette,
  Undo2,
  Redo2,
  Layers,
  TrendingUp,
  DollarSign,
  Send,
  Sparkles,
  Eraser,
  Loader2,
} from "lucide-react";
import { SiX, SiTelegram } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import type { TokenMetrics } from "@shared/schema";

interface StickerInfo {
  id: string;
  name: string;
  category: string;
}

const getStickerUrl = (stickerId: string) => `/api/sticker-proxy/${stickerId}`;

const COLOR_PRESETS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#000000" },
  { name: "4chan Green", hex: "#00FF00" },
  { name: "Dark Gray", hex: "#1a1a1a" },
  { name: "Charcoal", hex: "#2c2c2c" },
  { name: "Navy", hex: "#001f3f" },
  { name: "Electric Blue", hex: "#0074D9" },
  { name: "Neon Pink", hex: "#FF1493" },
  { name: "Cyber Purple", hex: "#9B59B6" },
  { name: "Matrix Green", hex: "#00FF41" },
  { name: "Sunset Orange", hex: "#FF4500" },
  { name: "Laser Red", hex: "#FF0000" },
  { name: "Soft Pink", hex: "#FFB6C1" },
  { name: "Mint", hex: "#98FF98" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Peach", hex: "#FFDAB9" },
];

const GRADIENT_PRESETS = [
  { name: "Sunset", colors: ["#FF512F", "#DD2476"] },
  { name: "Ocean", colors: ["#2E3192", "#1BFFFF"] },
  { name: "Cyberpunk", colors: ["#8E2DE2", "#4A00E0"] },
  { name: "Vaporwave", colors: ["#FF6FD8", "#3813C2"] },
  { name: "Matrix", colors: ["#0f2618", "#1a1a1a"] },
  { name: "Fire", colors: ["#f12711", "#f5af19"] },
  { name: "Midnight", colors: ["#232526", "#414345"] },
  { name: "Emerald", colors: ["#134E5E", "#71B280"] },
];

const PATTERN_PRESETS = [
  { name: "Grid", id: "grid" },
  { name: "Checkerboard", id: "checkerboard" },
  { name: "Diagonal", id: "diagonal" },
  { name: "Dots", id: "dots" },
  { name: "Stars", id: "stars" },
  { name: "Binary", id: "binary" },
];

const FONT_OPTIONS = [
  { name: "Impact", value: "Impact" },
  { name: "Arial Black", value: "Arial Black" },
  { name: "Comic Sans MS", value: "Comic Sans MS" },
  { name: "Courier New", value: "Courier New" },
  { name: "JetBrains Mono", value: "JetBrains Mono" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Roboto Mono", value: "Roboto Mono" },
  { name: "Space Mono", value: "Space Mono" },
];

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  font: string;
  align: "left" | "center" | "right";
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
}

interface StickerElement {
  id: string;
  type: "sticker" | "emoji";
  content: string;
  url?: string;
  imageLoaded?: boolean;
  x: number;
  y: number;
  scale: number;
}

interface CanvasState {
  textElements: TextElement[];
  stickerElements: StickerElement[];
  backgroundColor: string;
  gradientColors: string[] | null;
  patternId: string | null;
}

export function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [prevBgUrl, setPrevBgUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#2c2c2c");
  const [gradientColors, setGradientColors] = useState<string[] | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([]);
  const [loadedStickerImages, setLoadedStickerImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [fontSize, setFontSize] = useState([40]);
  const [selectedFont, setSelectedFont] = useState("Impact");
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState([3]);
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur] = useState([5]);
  const [emojiSize, setEmojiSize] = useState([60]);
  const [stickerSize, setStickerSize] = useState([1.5]);
  const [draggedElement, setDraggedElement] = useState<{ type: "text" | "sticker"; id: string } | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ type: "text" | "sticker"; id: string } | null>(null);
  const [stickerCategory, setStickerCategory] = useState<"normie" | "crypto" | "brand">("normie");
  const [bgMode, setBgMode] = useState<"solid" | "gradient" | "pattern">("pattern");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [patternId, setPatternId] = useState<string | null>("grid");
  
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const upscalerRef = useRef<typeof Upscaler.prototype | null>(null);

  const { data: metrics, isLoading: metricsLoading } = useQuery<TokenMetrics>({
    queryKey: ["/api/metrics"],
    refetchInterval: 30000,
  });

  const { data: allStickersData, isLoading: stickersLoading } = useQuery<StickerInfo[]>({
    queryKey: ["/api/stickers"],
  });

  const hasValidMetrics = metrics && metrics.price > 0;

  const formatPrice = (price: number | undefined | null) => {
    if (!price || price <= 0) return "$0.00";
    if (price < 0.00001) return `$${price.toFixed(8)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatMarketCap = (mc: number | undefined | null) => {
    if (!mc || mc <= 0) return "$0";
    if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
    if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`;
    if (mc >= 1e3) return `$${(mc / 1e3).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  const saveToHistory = useCallback((
    newTextElements?: TextElement[],
    newStickerElements?: StickerElement[],
    newBackgroundColor?: string,
    newGradientColors?: string[] | null,
    newPatternId?: string | null
  ) => {
    const state: CanvasState = {
      textElements: [...(newTextElements ?? textElements)],
      stickerElements: [...(newStickerElements ?? stickerElements)],
      backgroundColor: newBackgroundColor ?? backgroundColor,
      gradientColors: newGradientColors !== undefined ? newGradientColors : gradientColors,
      patternId: newPatternId !== undefined ? newPatternId : patternId,
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [textElements, stickerElements, backgroundColor, gradientColors, patternId, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTextElements(prevState.textElements);
      setStickerElements(prevState.stickerElements);
      setBackgroundColor(prevState.backgroundColor);
      setGradientColors(prevState.gradientColors);
      setPatternId(prevState.patternId);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTextElements(nextState.textElements);
      setStickerElements(nextState.stickerElements);
      setBackgroundColor(nextState.backgroundColor);
      setGradientColors(nextState.gradientColors);
      setPatternId(nextState.patternId);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  const drawPattern = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, pattern: string) => {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(34, 197, 94, 0.3)";
    ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
    
    switch (pattern) {
      case "grid":
        for (let x = 0; x <= width; x += 30) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
      case "checkerboard":
        for (let x = 0; x < width; x += 40) {
          for (let y = 0; y < height; y += 40) {
            if ((x / 40 + y / 40) % 2 === 0) {
              ctx.fillRect(x, y, 40, 40);
            }
          }
        }
        break;
      case "diagonal":
        for (let i = -height; i < width + height; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + height, height);
          ctx.stroke();
        }
        break;
      case "dots":
        for (let x = 20; x < width; x += 40) {
          for (let y = 20; y < height; y += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case "stars":
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let x = 30; x < width; x += 60) {
          for (let y = 30; y < height; y += 60) {
            ctx.fillText("*", x, y);
          }
        }
        break;
      case "binary":
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        for (let y = 10; y < height; y += 14) {
          let line = "";
          for (let x = 0; x < width / 6; x++) {
            line += Math.random() > 0.5 ? "1" : "0";
          }
          ctx.fillText(line, 2, y);
        }
        break;
    }
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage) {
      const scale = Math.min(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
      const x = (canvas.width - backgroundImage.width * scale) / 2;
      const y = (canvas.height - backgroundImage.height * scale) / 2;
      ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
    } else if (patternId) {
      drawPattern(ctx, canvas.width, canvas.height, patternId);
    } else if (gradientColors) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, gradientColors[0]);
      gradient.addColorStop(1, gradientColors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(34, 197, 94, 0.05)";
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    stickerElements.forEach((sticker) => {
      ctx.save();
      ctx.translate(sticker.x, sticker.y);
      ctx.scale(sticker.scale, sticker.scale);
      
      if (sticker.type === "emoji") {
        ctx.font = "48px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sticker.content, 0, 0);
      } else if (sticker.url) {
        const img = loadedStickerImages.get(sticker.url);
        if (img) {
          const baseSize = 120;
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          let width, height;
          if (aspectRatio >= 1) {
            width = baseSize;
            height = baseSize / aspectRatio;
          } else {
            height = baseSize;
            width = baseSize * aspectRatio;
          }
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
        } else {
          ctx.fillStyle = "rgba(34, 197, 94, 0.5)";
          ctx.font = "12px JetBrains Mono";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Loading...", 0, 0);
        }
      }
      
      ctx.restore();
    });

    textElements.forEach((text) => {
      ctx.save();
      ctx.font = `bold ${text.fontSize}px ${text.font}`;
      ctx.textAlign = text.align;
      ctx.textBaseline = "middle";
      
      if (text.shadowEnabled) {
        ctx.shadowColor = text.shadowColor;
        ctx.shadowBlur = text.shadowBlur;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      }
      
      if (text.strokeEnabled) {
        ctx.strokeStyle = text.strokeColor;
        ctx.lineWidth = text.strokeWidth;
        ctx.strokeText(text.text, text.x, text.y);
      }
      
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    });

    ctx.font = "bold 12px JetBrains Mono";
    ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
    ctx.textAlign = "right";
    ctx.fillText("$NORMIE", canvas.width - 10, canvas.height - 10);
  }, [backgroundImage, backgroundColor, gradientColors, patternId, textElements, stickerElements, drawPattern, loadedStickerImages]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    stickerElements.forEach((sticker) => {
      if (sticker.url && !loadedStickerImages.has(sticker.url)) {
        const img = new Image();
        img.onload = () => {
          setLoadedStickerImages((prev) => {
            const newMap = new Map(prev);
            newMap.set(sticker.url!, img);
            return newMap;
          });
        };
        img.src = sticker.url;
      }
    });
  }, [stickerElements, loadedStickerImages]);

  useEffect(() => {
    if (!allStickersData) return;
    allStickersData.forEach((sticker) => {
      const url = getStickerUrl(sticker.id);
      if (!loadedStickerImages.has(url)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setLoadedStickerImages((prev) => {
            const newMap = new Map(prev);
            newMap.set(url, img);
            return newMap;
          });
        };
        img.onerror = () => {
          // Failed to load sticker silently
        };
        img.src = url;
      }
    });
  }, [allStickersData, loadedStickerImages]);

  const deleteSelectedElement = useCallback(() => {
    if (!selectedElement) return;
    
    if (selectedElement.type === "text") {
      const newTextElements = textElements.filter(t => t.id !== selectedElement.id);
      setTextElements(newTextElements);
      saveToHistory(newTextElements, stickerElements);
    } else {
      const newStickerElements = stickerElements.filter(s => s.id !== selectedElement.id);
      setStickerElements(newStickerElements);
      saveToHistory(textElements, newStickerElements);
    }
    setSelectedElement(null);
  }, [selectedElement, textElements, stickerElements, saveToHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElement && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          deleteSelectedElement();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedElement, deleteSelectedElement]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
          setGradientColors(null);
          setPatternId(null);
          saveToHistory(textElements, stickerElements, backgroundColor, null, null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpscaleImage = async () => {
    if (!backgroundImage || isUpscaling) return;
    
    setIsUpscaling(true);
    setProcessingProgress(10);
    
    try {
      if (!upscalerRef.current) {
        upscalerRef.current = new Upscaler();
      }
      
      setProcessingProgress(30);
      
      const upscaledSrc = await upscalerRef.current.upscale(backgroundImage, {
        patchSize: 64,
        padding: 2,
        progress: (progress: number) => {
          setProcessingProgress(30 + Math.round(progress * 60));
        },
      });
      
      setProcessingProgress(95);
      
      const newImg = new Image();
      newImg.onload = () => {
        if (prevBgUrl && prevBgUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prevBgUrl);
        }
        setPrevBgUrl(newImg.src);
        setBackgroundImage(newImg);
        setProcessingProgress(100);
        toast({
          title: "Image Enhanced",
          description: "Resolution has been improved using AI upscaling.",
        });
        setTimeout(() => {
          setProcessingProgress(0);
        }, 500);
      };
      newImg.onerror = () => {
        toast({
          title: "Enhancement Failed",
          description: "Could not load the enhanced image.",
          variant: "destructive",
        });
      };
      newImg.src = upscaledSrc as string;
    } catch (error) {
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpscaling(false);
      setProcessingProgress(0);
    }
  };

  const handleRemoveBackground = async () => {
    if (!backgroundImage || isRemovingBg) return;
    
    setIsRemovingBg(true);
    setProcessingProgress(10);
    
    try {
      setProcessingProgress(20);
      
      const blob = await removeBackground(backgroundImage.src, {
        progress: (key: string, current: number, total: number) => {
          const progress = Math.round((current / total) * 70) + 20;
          setProcessingProgress(Math.min(progress, 90));
        },
      });
      
      setProcessingProgress(95);
      
      if (prevBgUrl && prevBgUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prevBgUrl);
      }
      
      const url = URL.createObjectURL(blob);
      setPrevBgUrl(url);
      
      const newImg = new Image();
      newImg.onload = () => {
        setBackgroundImage(newImg);
        setProcessingProgress(100);
        toast({
          title: "Background Removed",
          description: "The background has been removed from your image.",
        });
        setTimeout(() => {
          setProcessingProgress(0);
        }, 500);
      };
      newImg.onerror = () => {
        URL.revokeObjectURL(url);
        toast({
          title: "Removal Failed",
          description: "Could not load the processed image.",
          variant: "destructive",
        });
      };
      newImg.src = url;
    } catch (error) {
      toast({
        title: "Background Removal Failed",
        description: "Could not remove the background. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingBg(false);
      setProcessingProgress(0);
    }
  };

  const addText = () => {
    if (!newText.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: newText,
      x: canvas.width / 2,
      y: canvas.height / 2,
      fontSize: fontSize[0],
      color: textColor,
      font: selectedFont,
      align: textAlign,
      strokeEnabled,
      strokeColor,
      strokeWidth: strokeWidth[0],
      shadowEnabled,
      shadowColor,
      shadowBlur: shadowBlur[0],
    };
    const newTextElements = [...textElements, newElement];
    setTextElements(newTextElements);
    setNewText("");
    saveToHistory(newTextElements, stickerElements);
  };

  const addEmoji = (emojiData: EmojiClickData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newElement: StickerElement = {
      id: `emoji-${Date.now()}`,
      type: "emoji",
      content: emojiData.emoji,
      x: canvas.width / 2,
      y: canvas.height / 2,
      scale: emojiSize[0] / 48,
    };
    const newStickerElements = [...stickerElements, newElement];
    setStickerElements(newStickerElements);
    saveToHistory(textElements, newStickerElements);
  };

  const addSticker = (sticker: StickerInfo) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = getStickerUrl(sticker.id);
    const newElement: StickerElement = {
      id: `sticker-${Date.now()}`,
      type: "sticker",
      content: sticker.name,
      url: url,
      x: canvas.width / 2,
      y: canvas.height / 2,
      scale: stickerSize[0],
    };
    const newStickerElements = [...stickerElements, newElement];
    setStickerElements(newStickerElements);
    saveToHistory(textElements, newStickerElements);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const sticker of stickerElements) {
      const dist = Math.sqrt((x - sticker.x) ** 2 + (y - sticker.y) ** 2);
      if (dist < 60 * sticker.scale) {
        setDraggedElement({ type: "sticker", id: sticker.id });
        setSelectedElement({ type: "sticker", id: sticker.id });
        return;
      }
    }

    for (const text of textElements) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `bold ${text.fontSize}px ${text.font}`;
        const metrics = ctx.measureText(text.text);
        const width = metrics.width;
        const height = text.fontSize;
        
        if (
          x >= text.x - width / 2 &&
          x <= text.x + width / 2 &&
          y >= text.y - height / 2 &&
          y <= text.y + height / 2
        ) {
          setDraggedElement({ type: "text", id: text.id });
          setSelectedElement({ type: "text", id: text.id });
          return;
        }
      }
    }
    
    setSelectedElement(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (draggedElement.type === "text") {
      setTextElements(
        textElements.map((t) =>
          t.id === draggedElement.id ? { ...t, x, y } : t
        )
      );
    } else {
      setStickerElements(
        stickerElements.map((s) =>
          s.id === draggedElement.id ? { ...s, x, y } : s
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggedElement) {
      saveToHistory(textElements, stickerElements);
    }
    setDraggedElement(null);
  };

  // Touch event handlers for mobile drag support
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    // Check stickers first (they're on top)
    for (const sticker of stickerElements) {
      const dist = Math.sqrt((x - sticker.x) ** 2 + (y - sticker.y) ** 2);
      if (dist < 60 * sticker.scale) {
        setDraggedElement({ type: "sticker", id: sticker.id });
        setSelectedElement({ type: "sticker", id: sticker.id });
        return;
      }
    }

    // Check text elements
    for (const text of textElements) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `bold ${text.fontSize}px ${text.font}`;
        const metrics = ctx.measureText(text.text);
        const width = metrics.width;
        const height = text.fontSize;
        
        if (
          x >= text.x - width / 2 &&
          x <= text.x + width / 2 &&
          y >= text.y - height / 2 &&
          y <= text.y + height / 2
        ) {
          setDraggedElement({ type: "text", id: text.id });
          setSelectedElement({ type: "text", id: text.id });
          return;
        }
      }
    }
    
    setSelectedElement(null);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!draggedElement) return;
    e.preventDefault();

    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    if (draggedElement.type === "text") {
      setTextElements(
        textElements.map((t) =>
          t.id === draggedElement.id ? { ...t, x, y } : t
        )
      );
    } else {
      setStickerElements(
        stickerElements.map((s) =>
          s.id === draggedElement.id ? { ...s, x, y } : s
        )
      );
    }
  };

  const handleCanvasTouchEnd = () => {
    if (draggedElement) {
      saveToHistory(textElements, stickerElements);
    }
    setDraggedElement(null);
  };

  const clearCanvas = () => {
    const emptyText: TextElement[] = [];
    const emptyStickers: StickerElement[] = [];
    setTextElements(emptyText);
    setStickerElements(emptyStickers);
    setBackgroundImage(null);
    setGradientColors(null);
    setPatternId(null);
    setBackgroundColor("#1a1a1a");
    setSelectedElement(null);
    saveToHistory(emptyText, emptyStickers, "#1a1a1a", null, null);
  };

  const downloadMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `normie-meme-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareToX = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
      
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        toast({
          title: "Meme copied to clipboard!",
          description: "Now paste it in your X post",
        });
      }
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please download the meme and upload it manually",
        variant: "destructive",
      });
    }

    setTimeout(() => {
      const text = encodeURIComponent(
        "Check out my $NORMIE meme! Normies unite! @NormieCEO #NORMIE #Solana"
      );
      window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
    }, 500);
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(
      "Check out my $NORMIE meme! Join the Normie Nation! https://t.me/TheNormieNation"
    );
    window.open(`https://t.me/share/url?url=&text=${text}`, "_blank");
  };

  const addPriceStamp = () => {
    if (!hasValidMetrics) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const priceText = `PRICE: ${formatPrice(metrics!.price)}`;
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: priceText,
      x: canvas.width - 120,
      y: 40,
      fontSize: 24,
      color: "#22c55e",
      font: "JetBrains Mono",
      align: "right",
      strokeEnabled: true,
      strokeColor: "#000000",
      strokeWidth: 2,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 0,
    };
    const newTextElements = [...textElements, newElement];
    setTextElements(newTextElements);
    saveToHistory(newTextElements, stickerElements);
  };

  const addMcapStamp = () => {
    if (!hasValidMetrics) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mcapText = `MCAP: ${formatMarketCap(metrics!.marketCap)}`;
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: mcapText,
      x: canvas.width - 120,
      y: 70,
      fontSize: 24,
      color: "#22c55e",
      font: "JetBrains Mono",
      align: "right",
      strokeEnabled: true,
      strokeColor: "#000000",
      strokeWidth: 2,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 0,
    };
    const newTextElements = [...textElements, newElement];
    setTextElements(newTextElements);
    saveToHistory(newTextElements, stickerElements);
  };

  const addLiveDataBadge = () => {
    if (!hasValidMetrics) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const priceChange = metrics!.priceChange24h >= 0 ? `+${metrics!.priceChange24h.toFixed(1)}%` : `${metrics!.priceChange24h.toFixed(1)}%`;
    const badgeText = `$NORMIE ${formatPrice(metrics!.price)} (${priceChange})`;
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: badgeText,
      x: canvas.width / 2,
      y: canvas.height - 40,
      fontSize: 20,
      color: metrics.priceChange24h >= 0 ? "#22c55e" : "#ef4444",
      font: "JetBrains Mono",
      align: "center",
      strokeEnabled: true,
      strokeColor: "#000000",
      strokeWidth: 2,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 0,
    };
    const newTextElements = [...textElements, newElement];
    setTextElements(newTextElements);
    saveToHistory(newTextElements, stickerElements);
  };

  const getStickersByCategory = (): StickerInfo[] => {
    if (!allStickersData) return [];
    return allStickersData.filter(s => s.category === stickerCategory);
  };

  return (
    <section id="meme-generator" className="py-8 lg:py-12 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl lg:text-3xl font-mono font-bold uppercase tracking-tight">
            MEME GENERATOR
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Create chaos. Fuel the raids. Share the vibes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-4 overflow-hidden">
              <div className="relative aspect-square bg-background rounded-md overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="w-full h-full cursor-crosshair touch-none"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  data-testid="canvas-meme"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    data-testid="button-undo"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    data-testid="button-redo"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    data-testid="button-clear-canvas"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareToX}
                    data-testid="button-share-x"
                  >
                    <SiX className="h-4 w-4 mr-1" />
                    X
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareToTelegram}
                    data-testid="button-share-telegram"
                  >
                    <SiTelegram className="h-4 w-4 mr-1" />
                    TG
                  </Button>
                  <Button
                    size="sm"
                    onClick={downloadMeme}
                    data-testid="button-download-meme"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Live Data:
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPriceStamp}
                  disabled={!hasValidMetrics || metricsLoading}
                  data-testid="button-add-price"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {metricsLoading ? "Loading..." : "Price"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMcapStamp}
                  disabled={!hasValidMetrics || metricsLoading}
                  data-testid="button-add-mcap"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {metricsLoading ? "Loading..." : "MCap"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLiveDataBadge}
                  disabled={!hasValidMetrics || metricsLoading}
                  data-testid="button-add-badge"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {metricsLoading ? "Loading..." : "Full Badge"}
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-4">
              <Tabs defaultValue="emoji">
                <TabsList className="w-full mb-4 grid grid-cols-4">
                  <TabsTrigger value="emoji" data-testid="tab-emoji">
                    <Smile className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="stickers" data-testid="tab-stickers">
                    <Layers className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="text" data-testid="tab-text">
                    <Type className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="background" data-testid="tab-background">
                    <Palette className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="emoji" className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Emoji Size: {emojiSize[0]}px
                    </Label>
                    <Slider
                      value={emojiSize}
                      onValueChange={setEmojiSize}
                      min={24}
                      max={120}
                      step={4}
                      data-testid="slider-emoji-size"
                    />
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <EmojiPicker
                      onEmojiClick={addEmoji}
                      theme={Theme.DARK}
                      width="100%"
                      height={300}
                      searchPlaceholder="Search emoji..."
                      previewConfig={{ showPreview: false }}
                      lazyLoadEmojis
                      autoFocusSearch={false}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="stickers" className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant={stickerCategory === "normie" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStickerCategory("normie")}
                      data-testid="button-category-normie"
                    >
                      Normie
                    </Button>
                    <Button
                      variant={stickerCategory === "crypto" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStickerCategory("crypto")}
                      data-testid="button-category-crypto"
                    >
                      Crypto
                    </Button>
                    <Button
                      variant={stickerCategory === "brand" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStickerCategory("brand")}
                      data-testid="button-category-brand"
                    >
                      Brand
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Sticker Size: {stickerSize[0].toFixed(1)}x
                    </Label>
                    <Slider
                      value={stickerSize}
                      onValueChange={setStickerSize}
                      min={0.5}
                      max={3}
                      step={0.1}
                      data-testid="slider-sticker-size"
                    />
                  </div>
                  <ScrollArea className="h-[260px]">
                    {stickersLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground font-mono">Loading stickers...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {getStickersByCategory().map((sticker) => (
                          <Button
                            key={sticker.id}
                            variant="outline"
                            className="aspect-square p-2 flex flex-col items-center justify-center"
                            onClick={() => addSticker(sticker)}
                            data-testid={`button-sticker-${sticker.id}`}
                          >
                            <img
                              src={getStickerUrl(sticker.id)}
                              alt={sticker.name}
                              className="w-10 h-10 object-contain"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <span className="text-[9px] mt-1 truncate w-full text-center">
                              {sticker.name}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <ScrollArea className="h-[340px] pr-3">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter meme text..."
                          value={newText}
                          onChange={(e) => setNewText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addText()}
                          className="font-mono"
                          data-testid="input-meme-text"
                        />
                        <Button onClick={addText} data-testid="button-add-text">
                          Add
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          Font
                        </Label>
                        <Select value={selectedFont} onValueChange={setSelectedFont}>
                          <SelectTrigger data-testid="select-font">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }}>{font.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          Font Size: {fontSize[0]}px
                        </Label>
                        <Slider
                          value={fontSize}
                          onValueChange={setFontSize}
                          min={16}
                          max={80}
                          step={2}
                          data-testid="slider-font-size"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          Text Color
                        </Label>
                        <div className="flex flex-wrap items-center gap-1">
                          {["#FFFFFF", "#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"].map(
                            (color) => (
                              <button
                                key={color}
                                className={`w-7 h-7 rounded-md border-2 transition-all ${
                                  textColor === color
                                    ? "border-foreground scale-110"
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setTextColor(color)}
                                data-testid={`button-text-color-${color}`}
                              />
                            )
                          )}
                          <Input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="w-8 h-7 p-0 border-0 cursor-pointer"
                            data-testid="input-text-color-picker"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Align
                          </Label>
                          <div className="flex gap-1">
                            <Button
                              variant={textAlign === "left" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTextAlign("left")}
                              data-testid="button-align-left"
                            >
                              L
                            </Button>
                            <Button
                              variant={textAlign === "center" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTextAlign("center")}
                              data-testid="button-align-center"
                            >
                              C
                            </Button>
                            <Button
                              variant={textAlign === "right" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTextAlign("right")}
                              data-testid="button-align-right"
                            >
                              R
                            </Button>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Case
                          </Label>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNewText(newText.toUpperCase())}
                              data-testid="button-case-upper"
                            >
                              AA
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNewText(newText.toLowerCase())}
                              data-testid="button-case-lower"
                            >
                              aa
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 p-3 border rounded-md">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-mono">Stroke/Outline</Label>
                          <Switch
                            checked={strokeEnabled}
                            onCheckedChange={setStrokeEnabled}
                            data-testid="switch-stroke"
                          />
                        </div>
                        {strokeEnabled && (
                          <>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-mono w-16">Color</Label>
                              <Input
                                type="color"
                                value={strokeColor}
                                onChange={(e) => setStrokeColor(e.target.value)}
                                className="w-10 h-7 p-0 border-0 cursor-pointer"
                                data-testid="input-stroke-color"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-mono">Width: {strokeWidth[0]}px</Label>
                              <Slider
                                value={strokeWidth}
                                onValueChange={setStrokeWidth}
                                min={1}
                                max={10}
                                step={1}
                                data-testid="slider-stroke-width"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-3 p-3 border rounded-md">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-mono">Shadow</Label>
                          <Switch
                            checked={shadowEnabled}
                            onCheckedChange={setShadowEnabled}
                            data-testid="switch-shadow"
                          />
                        </div>
                        {shadowEnabled && (
                          <>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-mono w-16">Color</Label>
                              <Input
                                type="color"
                                value={shadowColor}
                                onChange={(e) => setShadowColor(e.target.value)}
                                className="w-10 h-7 p-0 border-0 cursor-pointer"
                                data-testid="input-shadow-color"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-mono">Blur: {shadowBlur[0]}px</Label>
                              <Slider
                                value={shadowBlur}
                                onValueChange={setShadowBlur}
                                min={0}
                                max={20}
                                step={1}
                                data-testid="slider-shadow-blur"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {textElements.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Added Text
                          </Label>
                          <div className="space-y-1">
                            {textElements.map((text) => (
                              <div
                                key={text.id}
                                className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md"
                              >
                                <span
                                  className="text-sm font-mono truncate"
                                  style={{ color: text.color }}
                                >
                                  {text.text}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setTextElements(textElements.filter((t) => t.id !== text.id))
                                  }
                                  data-testid={`button-delete-text-${text.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="background" className="space-y-4">
                  <ScrollArea className="h-[340px] pr-3">
                    <div className="space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="input-image-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-image"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>

                      {backgroundImage && (
                        <div className="space-y-3 p-3 rounded-md bg-muted/50">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Image Enhancement
                          </Label>
                          
                          {(isUpscaling || isRemovingBg) && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-xs font-mono text-muted-foreground">
                                  {isUpscaling ? "Enhancing resolution..." : "Removing background..."}
                                </span>
                              </div>
                              <Progress value={processingProgress} className="h-2" />
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={handleUpscaleImage}
                              disabled={isUpscaling || isRemovingBg}
                              data-testid="button-upscale-image"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Enhance
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={handleRemoveBackground}
                              disabled={isUpscaling || isRemovingBg}
                              data-testid="button-remove-bg"
                            >
                              <Eraser className="h-3 w-3 mr-1" />
                              Remove BG
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            AI-powered processing runs locally in your browser
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant={bgMode === "solid" ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setBgMode("solid")}
                          data-testid="button-bg-solid"
                        >
                          Solid
                        </Button>
                        <Button
                          variant={bgMode === "gradient" ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setBgMode("gradient")}
                          data-testid="button-bg-gradient"
                        >
                          Gradient
                        </Button>
                        <Button
                          variant={bgMode === "pattern" ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setBgMode("pattern")}
                          data-testid="button-bg-pattern"
                        >
                          Pattern
                        </Button>
                      </div>

                      {bgMode === "solid" ? (
                        <div className="space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Solid Colors
                          </Label>
                          <div className="grid grid-cols-6 gap-2">
                            {COLOR_PRESETS.map((color) => (
                              <button
                                key={color.hex}
                                className={`w-full aspect-square rounded-md border-2 transition-all ${
                                  backgroundColor === color.hex && !gradientColors
                                    ? "border-foreground scale-105"
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: color.hex }}
                                onClick={() => {
                                  setBackgroundColor(color.hex);
                                  setGradientColors(null);
                                  setPatternId(null);
                                  setBackgroundImage(null);
                                  saveToHistory(textElements, stickerElements, color.hex, null, null);
                                }}
                                title={color.name}
                                data-testid={`button-bg-color-${color.hex}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs font-mono">Custom:</Label>
                            <Input
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => {
                                setBackgroundColor(e.target.value);
                                setGradientColors(null);
                                setPatternId(null);
                                setBackgroundImage(null);
                              }}
                              className="w-10 h-8 p-0 border-0 cursor-pointer"
                              data-testid="input-bg-color-picker"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Gradients
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {GRADIENT_PRESETS.map((gradient) => (
                              <button
                                key={gradient.name}
                                className={`h-12 rounded-md border-2 transition-all ${
                                  gradientColors?.join() === gradient.colors.join()
                                    ? "border-foreground scale-[1.02]"
                                    : "border-transparent"
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]})`,
                                }}
                                onClick={() => {
                                  setGradientColors(gradient.colors);
                                  setPatternId(null);
                                  setBackgroundImage(null);
                                  saveToHistory(textElements, stickerElements, backgroundColor, gradient.colors, null);
                                }}
                                data-testid={`button-gradient-${gradient.name}`}
                              >
                                <span className="text-xs font-mono text-white drop-shadow-md">
                                  {gradient.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {bgMode === "pattern" && (
                        <div className="space-y-2">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Patterns
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {PATTERN_PRESETS.map((pattern) => (
                              <Button
                                key={pattern.id}
                                variant={patternId === pattern.id ? "default" : "outline"}
                                size="sm"
                                className="h-10"
                                onClick={() => {
                                  setPatternId(pattern.id);
                                  setGradientColors(null);
                                  setBackgroundImage(null);
                                  saveToHistory(textElements, stickerElements, backgroundColor, null, pattern.id);
                                }}
                                data-testid={`button-pattern-${pattern.id}`}
                              >
                                {pattern.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {stickerElements.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            Added Elements ({stickerElements.length})
                          </Label>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {stickerElements.map((sticker) => (
                              <div
                                key={sticker.id}
                                className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md"
                              >
                                <span className="text-sm font-mono">
                                  {sticker.type === "emoji" ? sticker.content : sticker.content}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newStickerElements = stickerElements.filter((s) => s.id !== sticker.id);
                                    setStickerElements(newStickerElements);
                                    saveToHistory(textElements, newStickerElements);
                                  }}
                                  data-testid={`button-delete-sticker-${sticker.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

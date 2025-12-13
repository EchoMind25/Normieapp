import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  Download,
  Type,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Share2,
  Sparkles,
  Palette,
} from "lucide-react";
import { SiX } from "react-icons/si";

const STICKERS = [
  { id: "pepe-happy", emoji: "happy", color: "#22c55e" },
  { id: "pepe-sad", emoji: "sad", color: "#ef4444" },
  { id: "pepe-rocket", emoji: "rocket", color: "#f59e0b" },
  { id: "pepe-diamond", emoji: "diamond", color: "#3b82f6" },
  { id: "pepe-fire", emoji: "fire", color: "#ef4444" },
  { id: "pepe-moon", emoji: "moon", color: "#eab308" },
  { id: "pepe-money", emoji: "money", color: "#22c55e" },
  { id: "pepe-crown", emoji: "crown", color: "#f59e0b" },
  { id: "normie-logo", emoji: "normie", color: "#22c55e" },
  { id: "wojak", emoji: "wojak", color: "#8b5cf6" },
  { id: "chad", emoji: "chad", color: "#06b6d4" },
  { id: "doge", emoji: "doge", color: "#f59e0b" },
];

const TEMPLATES = [
  { id: "blank", name: "Blank Canvas", bg: "#1a1a1a" },
  { id: "green", name: "Normie Green", bg: "#0f2618" },
  { id: "gradient", name: "Matrix", bg: "linear-gradient(135deg, #0f2618 0%, #1a1a1a 100%)" },
  { id: "terminal", name: "Terminal", bg: "#0a0a0a" },
  { id: "chaos", name: "Chaos Mode", bg: "linear-gradient(45deg, #1a1a1a, #22c55e20, #1a1a1a)" },
];

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  isDragging: boolean;
}

interface StickerElement {
  id: string;
  stickerId: string;
  x: number;
  y: number;
  scale: number;
  isDragging: boolean;
}

export function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[1]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([]);
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#22c55e");
  const [fontSize, setFontSize] = useState([32]);
  const [draggedElement, setDraggedElement] = useState<{ type: "text" | "sticker"; id: string } | null>(null);

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
    } else {
      if (selectedTemplate.bg.includes("gradient")) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#0f2618");
        gradient.addColorStop(1, "#1a1a1a");
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = selectedTemplate.bg;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    stickerElements.forEach((sticker) => {
      const stickerData = STICKERS.find((s) => s.id === sticker.stickerId);
      if (stickerData) {
        ctx.save();
        ctx.translate(sticker.x, sticker.y);
        ctx.scale(sticker.scale, sticker.scale);
        
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fillStyle = stickerData.color;
        ctx.fill();
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px JetBrains Mono";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(stickerData.emoji.charAt(0).toUpperCase(), 0, 0);
        
        ctx.restore();
      }
    });

    textElements.forEach((text) => {
      ctx.save();
      ctx.font = `bold ${text.fontSize}px JetBrains Mono`;
      ctx.fillStyle = text.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    });

    ctx.font = "bold 12px JetBrains Mono";
    ctx.fillStyle = "rgba(34, 197, 94, 0.5)";
    ctx.textAlign = "right";
    ctx.fillText("$NORMIE", canvas.width - 10, canvas.height - 10);
  }, [backgroundImage, selectedTemplate, textElements, stickerElements]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const addText = () => {
    if (!newText.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setTextElements([
      ...textElements,
      {
        id: `text-${Date.now()}`,
        text: newText,
        x: canvas.width / 2,
        y: canvas.height / 2,
        fontSize: fontSize[0],
        color: textColor,
        isDragging: false,
      },
    ]);
    setNewText("");
  };

  const addSticker = (stickerId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStickerElements([
      ...stickerElements,
      {
        id: `sticker-${Date.now()}`,
        stickerId,
        x: canvas.width / 2,
        y: canvas.height / 2,
        scale: 1.5,
        isDragging: false,
      },
    ]);
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
      if (dist < 30 * sticker.scale) {
        setDraggedElement({ type: "sticker", id: sticker.id });
        return;
      }
    }

    for (const text of textElements) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `bold ${text.fontSize}px JetBrains Mono`;
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
          return;
        }
      }
    }
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
    setDraggedElement(null);
  };

  const clearCanvas = () => {
    setTextElements([]);
    setStickerElements([]);
    setBackgroundImage(null);
  };

  const downloadMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `normie-meme-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareToX = () => {
    const text = encodeURIComponent(
      "Check out my $NORMIE meme! Normies unite! @NormieCEO #NORMIE #Solana"
    );
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <section id="meme-generator" className="py-8 lg:py-12 px-4 lg:px-8 bg-muted/30">
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
              <div 
                ref={containerRef}
                className="relative aspect-square bg-background rounded-md overflow-hidden grid-pattern"
              >
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="w-full h-full cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  data-testid="canvas-meme"
                />
              </div>
              <div className="flex items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
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
                    Share
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
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-4">
              <Tabs defaultValue="stickers">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="stickers" className="flex-1" data-testid="tab-stickers">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Stickers
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex-1" data-testid="tab-text">
                    <Type className="h-4 w-4 mr-1" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="background" className="flex-1" data-testid="tab-background">
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Background
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stickers" className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {STICKERS.map((sticker) => (
                      <Button
                        key={sticker.id}
                        variant="outline"
                        className="aspect-square p-2"
                        onClick={() => addSticker(sticker.id)}
                        data-testid={`button-sticker-${sticker.id}`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: sticker.color }}
                        >
                          {sticker.emoji.charAt(0).toUpperCase()}
                        </div>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono text-center">
                    Click to add, drag to position
                  </p>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-3">
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
                        Font Size: {fontSize[0]}px
                      </Label>
                      <Slider
                        value={fontSize}
                        onValueChange={setFontSize}
                        min={16}
                        max={72}
                        step={2}
                        data-testid="slider-font-size"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Text Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {["#22c55e", "#ffffff", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"].map(
                            (color) => (
                              <button
                                key={color}
                                className={`w-8 h-8 rounded-md border-2 transition-all ${
                                  textColor === color
                                    ? "border-foreground scale-110"
                                    : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setTextColor(color)}
                                data-testid={`button-color-${color}`}
                              />
                            )
                          )}
                        </div>
                        <Input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-10 h-8 p-0 border-0 cursor-pointer"
                          data-testid="input-color-picker"
                        />
                      </div>
                    </div>
                  </div>

                  {textElements.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Added Text
                      </Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
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
                </TabsContent>

                <TabsContent value="background" className="space-y-4">
                  <div className="space-y-3">
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

                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Templates
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {TEMPLATES.map((template) => (
                          <Button
                            key={template.id}
                            variant="outline"
                            className={`h-16 relative overflow-hidden ${
                              selectedTemplate.id === template.id
                                ? "ring-2 ring-primary"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedTemplate(template);
                              setBackgroundImage(null);
                            }}
                            data-testid={`button-template-${template.id}`}
                          >
                            <div
                              className="absolute inset-0"
                              style={{ background: template.bg }}
                            />
                            <span className="relative text-xs font-mono text-white/80">
                              {template.name}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

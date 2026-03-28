import React, { useRef, useState, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, X, Check, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WatermarkToolProps {
  onClose: () => void;
  defaultLogo?: string;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({ onClose, defaultLogo }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(defaultLogo || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoSize, setLogoSize] = useState(0.2); // 20% of width
  const [opacity, setOpacity] = useState(1.0); // Default to solid
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'base') setBaseImage(event.target?.result as string);
      else setLogoImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = () => {
    if (!baseImage || !logoImage || !canvasRef.current) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mainImg = new Image();
    const logoImg = new Image();

    mainImg.onload = () => {
      canvas.width = mainImg.width;
      canvas.height = mainImg.height;
      ctx.drawImage(mainImg, 0, 0);

      logoImg.onload = () => {
        // Calculate logo dimensions
        const lWidth = canvas.width * logoSize;
        const lHeight = (logoImg.height / logoImg.width) * lWidth;
        
        // Padding (2% of width)
        const padding = canvas.width * 0.02;

        ctx.globalAlpha = opacity;
        ctx.drawImage(logoImg, padding, padding, lWidth, lHeight);
        ctx.globalAlpha = 1.0;

        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
        setIsProcessing(false);
      };
      logoImg.src = logoImage;
    };
    mainImg.src = baseImage;
  };

  useEffect(() => {
    if (baseImage && logoImage) {
      processImage();
    }
  }, [baseImage, logoImage, logoSize, opacity]);

  const downloadImage = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = 'watermarked-image.jpg';
    link.href = previewUrl;
    link.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[60] bg-bg-cream flex flex-col"
    >
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between bg-white shadow-sm">
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-secondary" />
        </button>
        <h2 className="text-xl font-black text-secondary uppercase tracking-tight">Logo Overlay Tool</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        {/* Upload Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Main Image</label>
            <div className="relative aspect-square bg-white rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-primary transition-colors overflow-hidden">
              {baseImage ? (
                <img src={baseImage} className="absolute inset-0 w-full h-full object-cover" alt="Base" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-stone-300 mb-2" />
                  <span className="text-[10px] font-bold text-stone-400">Upload Photo</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handleFileChange(e, 'base')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Logo Image</label>
            <div className="relative aspect-square bg-white rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-secondary transition-colors overflow-hidden">
              {logoImage ? (
                <img src={logoImage} className="absolute inset-0 w-full h-full object-contain p-2" alt="Logo" />
              ) : (
                <>
                  <Move className="w-8 h-8 text-stone-300 mb-2" />
                  <span className="text-[10px] font-bold text-stone-400">Upload Logo</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handleFileChange(e, 'logo')}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        {baseImage && logoImage && (
          <div className="bg-white p-6 rounded-3xl shadow-xl space-y-6 border-2 border-stone-50">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-stone-800 uppercase tracking-widest">Logo Size</span>
                <span className="text-xs font-bold text-primary">{Math.round(logoSize * 100)}%</span>
              </div>
              <input 
                type="range" min="0.05" max="0.5" step="0.01" 
                value={logoSize} 
                onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-stone-800 uppercase tracking-widest">Opacity</span>
                <span className="text-xs font-bold text-primary">{Math.round(opacity * 100)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="1.0" step="0.05" 
                value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Preview</label>
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-white min-h-[200px] flex items-center justify-center relative">
            {previewUrl ? (
              <img src={previewUrl} className="w-full h-auto" alt="Preview" />
            ) : (
              <div className="text-center p-8">
                <ImageIcon className="w-12 h-12 text-stone-100 mx-auto mb-2" />
                <p className="text-xs text-stone-300 font-bold uppercase tracking-widest">Upload images to see preview</p>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Footer Action */}
      <div className="p-6 bg-white border-t border-stone-100">
        <button 
          disabled={!previewUrl}
          onClick={downloadImage}
          className="w-full bg-secondary disabled:bg-stone-200 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-secondary/20 flex items-center justify-center space-x-3 uppercase tracking-widest transition-all active:scale-95"
        >
          <Download className="w-6 h-6" />
          <span>Download Result</span>
        </button>
      </div>
    </motion.div>
  );
};

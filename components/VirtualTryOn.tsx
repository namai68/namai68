import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shirt, Sparkles, Loader2, Download, Wand2, Palette, Sun, Package, 
  User, Scissors, MapPin, Hand, CheckCircle, RefreshCw, Image as ImageIcon, Move, Banana,
  Key, X, ExternalLink
} from 'lucide-react';
import { generateVirtualTryOn, isolateClothingItem } from '../services/geminiService';
import { UploadBox } from './UploadBox';
import { ImageAsset, InteractionMode } from '../types';
import { fileToBase64 } from '../utils';

const LIGHTING_OPTIONS = [
  "Ánh sáng Studio",
  "Giờ vàng (Golden Hour)",
  "Neon Cyberpunk",
  "Ánh nắng tự nhiên",
  "Softbox (Mềm mại)",
  "Flash tương phản cao"
];

const FILTER_OPTIONS = [
  "Mặc định",
  "Rực rỡ",
  "Cổ điển (Vintage)",
  "Trắng đen",
  "Pastel dịu nhẹ",
  "Điện ảnh (Cinematic)"
];

interface VirtualTryOnProps {
  apiKey?: string;
  onApiKeyUpdate?: (key: string) => void;
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ apiKey: initialApiKey, onApiKeyUpdate }) => {
  const [apiKey, setApiKey] = useState(initialApiKey || localStorage.getItem('geminiApiKey') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  const [modelImage, setModelImage] = useState<ImageAsset | null>(null);
  const [productImage, setProductImage] = useState<ImageAsset | null>(null);
  const [outfitImage, setOutfitImage] = useState<ImageAsset | null>(null);
  const [bgImage, setBgImage] = useState<ImageAsset | null>(null);

  // Interaction State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('wear');
  const [customPose, setCustomPose] = useState('');
  const [customBackground, setCustomBackground] = useState('');

  // Config State
  const [lighting, setLighting] = useState(LIGHTING_OPTIONS[0]);
  const [filter, setFilter] = useState(FILTER_OPTIONS[0]);
  const [beautyOptions, setBeautyOptions] = useState<string[]>([]);
  
  // Results State
  const [results, setResults] = useState<string[]>([]);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingIdx, setIsRegeneratingIdx] = useState<number | null>(null);
  const [isIsolating, setIsIsolating] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialApiKey && initialApiKey !== apiKey) {
      setApiKey(initialApiKey);
    }
  }, [initialApiKey]);

  useEffect(() => {
    if (results.length > 0 && window.innerWidth < 1024 && resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  const handleModelUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setModelImage({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
    } catch (e) {
      alert("Lỗi tải ảnh");
    }
  };

  const handleProductUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setProductImage({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
    } catch (e) {
      alert("Lỗi tải sản phẩm");
    }
  };

  const handleOutfitUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setOutfitImage({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
    } catch (e) {
      alert("Lỗi tải trang phục");
    }
  };

  const handleBgUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setBgImage({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
    } catch (e) {
      alert("Lỗi tải bối cảnh");
    }
  };

  const handleIsolateProduct = async (type: 'product' | 'outfit') => {
      if (!apiKey) {
          setShowApiKeyModal(true);
          return;
      }
      const target = type === 'product' ? productImage : outfitImage;
      if (!target) return;
      setIsIsolating(true);
      try {
          const isolatedUrl = await isolateClothingItem(target, apiKey);
          if (isolatedUrl) {
              const base64Clean = isolatedUrl.split(',')[1];
              if (type === 'product') {
                  setProductImage(prev => prev ? { ...prev, previewUrl: isolatedUrl, base64: base64Clean } : null);
              } else {
                  setOutfitImage(prev => prev ? { ...prev, previewUrl: isolatedUrl, base64: base64Clean } : null);
              }
          } else {
              alert("AI không thể tách vật thể. Hãy thử ảnh rõ ràng hơn.");
          }
      } catch (e) {
          console.error(e);
          alert("Lỗi xử lý AI. Vui lòng thử lại sau.");
      } finally {
          setIsIsolating(false);
      }
  };

  const handleGenerate = async (keyToUse = apiKey) => {
    if (!keyToUse) {
        setShowApiKeyModal(true);
        return;
    }

    if (!modelImage || !productImage) {
        alert("Vui lòng tải lên đầy đủ ảnh người mẫu và sản phẩm.");
        return;
    }
    
    setIsGenerating(true);
    setResults([]);
    setSelectedResultIdx(0);

    const prodImg = productImage;
    const extraOutfit = interactionMode === 'hold' ? outfitImage : null;
    const backgroundImage = bgImage;

    const totalCount = 3;
    
    const generationPromises = Array.from({ length: totalCount }).map((_, i) => 
      generateVirtualTryOn(
        modelImage, 
        "", 
        lighting, 
        filter, 
        beautyOptions,
        prodImg || undefined,
        interactionMode,
        customBackground,
        extraOutfit || undefined,
        customPose,
        i, 
        backgroundImage || undefined,
        keyToUse
      ).catch(err => {
        console.error(`Error generating image ${i + 1}:`, err);
        return null;
      })
    );

    try {
      const batchResults = await Promise.all(generationPromises);
      const successfulImages = batchResults.filter((url): url is string => url !== null);
      
      if (successfulImages.length === 0) {
        throw new Error("Không thể tạo được ảnh nào. Vui lòng thử lại với ảnh rõ ràng hơn.");
      }
      
      setResults(successfulImages);
    } catch (e: any) {
      console.error(e);
      alert("Quá trình tạo ảnh gặp sự cố: " + (e.message || "Lỗi máy chủ AI"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateOne = async (index: number) => {
    if (!apiKey) {
        setShowApiKeyModal(true);
        return;
    }
    if (!modelImage || !productImage || isGenerating || isRegeneratingIdx !== null) return;
    
    setIsRegeneratingIdx(index);
    try {
      const prodImg = productImage;
      const extraOutfit = interactionMode === 'hold' ? outfitImage : null;
      const backgroundImage = bgImage;

      const url = await generateVirtualTryOn(
          modelImage, 
          "", 
          lighting, 
          filter, 
          beautyOptions,
          prodImg || undefined,
          interactionMode,
          customBackground,
          extraOutfit || undefined,
          customPose,
          index,
          backgroundImage || undefined,
          apiKey
      );
      
      if (url) {
        const newResults = [...results];
        newResults[index] = url;
        setResults(newResults);
      } else {
        alert("AI không thể tạo lại ảnh này lúc này.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tạo lại ảnh.");
    } finally {
      setIsRegeneratingIdx(null);
    }
  };

  const handleDownload = (index: number) => {
    const url = results[index];
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `thoi-trang-ai-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) {
      alert("Vui lòng nhập API Key");
      return;
    }
    const cleanKey = tempApiKey.trim();
    setApiKey(cleanKey);
    localStorage.setItem('geminiApiKey', cleanKey);
    if (onApiKeyUpdate) onApiKeyUpdate(cleanKey);
    setShowApiKeyModal(false);
    handleGenerate(cleanKey);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full flex flex-col pb-20 lg:pb-0 lg:overflow-hidden overflow-y-auto relative"
    >
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Key size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Nhập Gemini API Key</h3>
                </div>
                <button onClick={() => setShowApiKeyModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8">
                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                  Để sử dụng tính năng Mặc đồ với AI, bạn cần nhập Gemini API Key. Khóa này sẽ được lưu an toàn trong trình duyệt của bạn.
                </p>

                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mb-6">
                  <p className="text-orange-800 text-xs font-bold flex items-center gap-2 mb-1">
                    <Sparkles size={14} /> Hướng dẫn lấy API miễn phí tại đây:
                  </p>
                  <a 
                    href="https://aistudio.google.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs break-all font-medium flex items-center gap-1"
                  >
                    https://aistudio.google.com/api-keys <ExternalLink size={12} />
                  </a>
                </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">API Key của bạn</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="password" 
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                          placeholder="Dán API Key tại đây..."
                          autoFocus
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveApiKey}
                      className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 mt-4"
                    >
                      Tiếp tục chạy bước tiếp theo
                    </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="bg-white p-4 border-b border-gray-100 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
             <div className="p-2.5 bg-orange-50 rounded-2xl text-orange-600 shadow-sm border border-orange-100">
               <Shirt size={24} />
             </div>
             <div>
               <h1 className="font-extrabold text-slate-800 text-xl tracking-tight uppercase font-display">Studio Thử Đồ AI</h1>
               <p className="text-xs text-slate-500 font-medium font-body">Tạo đồng thời 3 phiên bản cao cấp cho mỗi yêu cầu</p>
             </div>
          </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 lg:overflow-hidden h-auto lg:h-full max-w-7xl mx-auto w-full">
          
          {/* LEFT: INPUT PANEL */}
          <div className="w-full lg:flex-[0.4] h-auto lg:h-full lg:overflow-y-auto custom-scrollbar bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-5 lg:p-7 flex flex-col shrink-0">
              <div className="space-y-8 flex-1">
                {/* 1. Model Upload */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center font-display">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                        <User size={14} className="text-orange-600"/>
                      </div>
                      1. Người mẫu tham khảo (Khuôn mặt/Dáng)
                   </label>
                   <UploadBox 
                     id="model-upload" 
                     label="Tải ảnh khuôn mặt / chân dung" 
                     image={modelImage} 
                     onUpload={handleModelUpload} 
                     onRemove={() => setModelImage(null)}
                     heightClass="h-44"
                   />
                </div>

                {/* 2. Interaction & Outfit Selection */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3 font-display">Chế độ AI: lưu ý tách sản phẩm hoặc trang phục trước khi tải lên</label>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <button 
                                onClick={() => setInteractionMode('wear')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all font-display ${interactionMode === 'wear' ? 'bg-white text-orange-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}
                            >
                                <Shirt size={14}/> Mặc đồ
                            </button>
                            <button 
                                onClick={() => setInteractionMode('hold')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all font-display ${interactionMode === 'hold' ? 'bg-white text-orange-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}
                            >
                                <Hand size={14}/> Cầm sản phẩm
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center font-display">
                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                                  <Package size={14} className="text-orange-600"/>
                                </div>
                                2. Tải ảnh {interactionMode === 'wear' ? 'Trang phục' : 'Sản phẩm'}
                            </label>
                            <UploadBox 
                                id="product-upload" 
                                label={interactionMode === 'wear' ? "Tải ảnh quần áo / váy" : "Tải ảnh túi xách, điện thoại..."}
                                image={productImage} 
                                onUpload={handleProductUpload} 
                                onRemove={() => setProductImage(null)}
                                heightClass="h-44"
                            />
                        </div>

                        <AnimatePresence>
                          {interactionMode === 'hold' && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center font-display">
                                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                                        <Shirt size={14} className="text-orange-600"/>
                                      </div>
                                      2b. Trang phục phụ (Tùy chọn)
                                  </label>
                                  <UploadBox 
                                      id="outfit-extra-upload" 
                                      label="Tải ảnh trang phục muốn mẫu mặc kèm"
                                      image={outfitImage} 
                                      onUpload={handleOutfitUpload} 
                                      onRemove={() => setOutfitImage(null)}
                                      heightClass="h-44"
                                  />
                              </motion.div>
                          )}
                        </AnimatePresence>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center font-display">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-2">
                                  <ImageIcon size={14} className="text-slate-600"/>
                                </div>
                                2c. Tải ảnh bối cảnh (Tùy chọn)
                            </label>
                            <UploadBox 
                                id="bg-upload" 
                                label="Tải ảnh không gian / địa điểm"
                                image={bgImage} 
                                onUpload={handleBgUpload} 
                                onRemove={() => setBgImage(null)}
                                heightClass="h-44"
                            />
                        </div>
                    </div>
                    
                    <AnimatePresence>
                      {(productImage || outfitImage) && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-orange-50 p-4 rounded-2xl border border-orange-100"
                          >
                              <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-black text-orange-700 flex items-center gap-1 uppercase tracking-tighter font-display">
                                      <Sparkles size={14}/> Tách nền chuyên nghiệp (PRO)
                                  </h4>
                              </div>
                              <div className="flex gap-2">
                                  {productImage && (
                                      <motion.button 
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleIsolateProduct('product')}
                                          disabled={isIsolating}
                                          className={`flex-1 py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm font-display ${isIsolating ? 'bg-orange-200 text-orange-400' : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'}`}
                                      >
                                          {isIsolating ? <Loader2 size={12} className="animate-spin"/> : <Scissors size={12}/>}
                                          Tách sản phẩm
                                      </motion.button>
                                  )}
                                  {outfitImage && interactionMode === 'hold' && (
                                      <motion.button 
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleIsolateProduct('outfit')}
                                          disabled={isIsolating}
                                          className={`flex-1 py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm font-display ${isIsolating ? 'bg-orange-200 text-orange-400' : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'}`}
                                      >
                                          {isIsolating ? <Loader2 size={12} className="animate-spin"/> : <Scissors size={12}/>}
                                          Tách trang phục
                                      </motion.button>
                                  )}
                              </div>
                          </motion.div>
                      )}
                    </AnimatePresence>
                </div>

                {/* SCENE DESCRIPTION */}
                <div className="border-t border-slate-100 pt-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center font-display">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-2">
                              <Move size={14} className="text-slate-600"/>
                            </div>
                            3. Tư thế đứng
                        </label>
                        <textarea 
                            value={customPose}
                            onChange={(e) => setCustomPose(e.target.value)}
                            placeholder="VD: Đang bước đi về phía máy ảnh, tay chống hông, đang ngồi trên ghế..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm h-20 resize-none transition-all font-body"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center font-display">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-2">
                              <MapPin size={14} className="text-slate-600"/>
                            </div>
                            4. Bối cảnh / Không gian (Mô tả bằng chữ)
                        </label>
                        <textarea 
                            value={customBackground}
                            onChange={(e) => setCustomBackground(e.target.value)}
                            placeholder="VD: Nội thất boutique sang trọng, phố Paris ban đêm, studio tối giản..."
                            className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm h-20 resize-none transition-all font-body ${bgImage ? 'opacity-50' : ''}`}
                            disabled={!!bgImage}
                        />
                        {bgImage && <p className="text-[10px] text-orange-600 font-bold mt-1 font-body">* Ưu tiên sử dụng bối cảnh từ hình ảnh đã tải lên.</p>}
                    </div>
                </div>

                {/* VISUAL CONFIG */}
                <div className="border-t border-slate-100 pt-8 space-y-5">
                   <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 font-display">
                       Thông số hình ảnh
                   </h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center font-display"><Sun size={12} className="mr-1.5"/> Ánh sáng</label>
                          <select 
                            value={lighting} 
                            onChange={(e) => setLighting(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-body"
                          >
                             {LIGHTING_OPTIONS.map((l, i) => <option key={i} value={l}>{l}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center font-display"><Palette size={12} className="mr-1.5"/> Bộ lọc</label>
                          <select 
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-body"
                          >
                             {FILTER_OPTIONS.map((f, i) => <option key={i} value={f}>{f}</option>)}
                          </select>
                      </div>
                   </div>
                </div>
              </div>

              {/* GENERATE BUTTON */}
              <div className="pt-8 mt-8 border-t border-slate-100">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGenerate()}
                    disabled={!modelImage || isGenerating || !productImage}
                    className="w-full py-4.5 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 disabled:opacity-50 transition-all shadow-xl shadow-orange-200 flex items-center justify-center group active:scale-[0.98] font-display"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" /> : (
                      <>
                        <Wand2 className="mr-2 group-hover:rotate-12 transition-transform" size={20} />
                        Tạo 3 phiên bản AI
                      </>
                    )}
                  </motion.button>
                  <div className="mt-4 p-4 rounded-2xl border border-orange-100 bg-orange-50/50 text-orange-800 text-[11px] flex items-start gap-3 font-body">
                      <Banana size={16} className="mt-0.5 shrink-0 text-orange-400"/>
                      <p className="leading-relaxed">
                          <strong>Công nghệ Batch-Gen:</strong> Gemini sẽ đồng thời tạo ra 3 phiên bản nhân vật khác nhau dựa trên tư thế và bối cảnh bạn yêu cầu.
                      </p>
                  </div>
              </div>
          </div>

          {/* RIGHT: RESULT PANEL */}
          <div ref={resultRef} className="w-full lg:flex-[0.6] h-auto lg:h-full lg:overflow-hidden bg-slate-100 rounded-[2.5rem] border-4 border-white flex flex-col relative shrink-0 shadow-2xl">
            <AnimatePresence>
              {isGenerating && results.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/80 backdrop-blur-md z-30 flex flex-col items-center justify-center text-orange-600"
                  >
                      <Loader2 size={56} className="animate-spin mb-6"/>
                      <p className="font-extrabold text-2xl animate-pulse tracking-tight text-center px-4 font-display">Đang tạo 3 mẫu AI chuyên nghiệp...</p>
                      <p className="text-sm text-orange-400 font-medium mt-2 font-body">Xử lý ánh sáng và texture thời trang</p>
                  </motion.div>
              )}
            </AnimatePresence>

            {results.length > 0 ? (
               <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* MAIN PREVIEW */}
                  <div className="flex-1 bg-slate-900 flex items-center justify-center relative min-h-[400px] overflow-hidden">
                     <AnimatePresence mode="wait">
                       <motion.img 
                          key={results[selectedResultIdx]}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          src={results[selectedResultIdx]} 
                          alt={`Kết quả ${selectedResultIdx + 1}`} 
                          className={`max-w-full max-h-full object-contain shadow-2xl ${isRegeneratingIdx === selectedResultIdx ? 'opacity-40 grayscale blur-sm' : ''}`} 
                       />
                     </AnimatePresence>
                     
                     <AnimatePresence>
                       {isRegeneratingIdx === selectedResultIdx && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/20"
                          >
                              <Loader2 size={40} className="animate-spin mb-3"/>
                              <p className="text-xs font-bold uppercase tracking-widest font-display">Đang tạo lại mẫu {selectedResultIdx + 1}...</p>
                          </motion.div>
                       )}
                     </AnimatePresence>

                     <div className="absolute top-6 right-6 flex flex-col gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRegenerateOne(selectedResultIdx)}
                          disabled={isRegeneratingIdx !== null || isGenerating}
                          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl text-white shadow-2xl transition-all group border border-white/20 disabled:opacity-50"
                          title="Tạo lại ảnh này"
                        >
                          <RefreshCw size={22} className={`${isRegeneratingIdx === selectedResultIdx ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDownload(selectedResultIdx)}
                          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl text-white shadow-2xl transition-all group border border-white/20"
                          title="Tải ảnh này"
                        >
                          <Download size={22} className="group-hover:translate-y-0.5 transition-transform" />
                        </motion.button>
                     </div>

                     <div className="absolute bottom-6 left-6 bg-black/40 text-white px-5 py-2.5 rounded-2xl text-xs font-bold backdrop-blur-xl flex items-center gap-2.5 border border-white/10 font-display">
                         <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                         Mẫu {selectedResultIdx + 1}/{results.length}
                     </div>
                  </div>

                  {/* THUMBNAIL STRIP */}
                  <div className="bg-white p-5 border-t border-slate-100 overflow-x-auto flex gap-4 custom-scrollbar shrink-0">
                      {results.map((url, idx) => (
                          <motion.button 
                            key={idx}
                            whileHover={{ y: -4 }}
                            onClick={() => setSelectedResultIdx(idx)}
                            className={`relative min-w-[100px] h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${selectedResultIdx === idx ? 'border-orange-500 ring-4 ring-orange-100' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                          >
                              <img src={url} className={`w-full h-full object-cover ${isRegeneratingIdx === idx ? 'blur-sm' : ''}`} alt={`Thu nhỏ ${idx + 1}`}/>
                              {isRegeneratingIdx === idx && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Loader2 size={16} className="animate-spin text-white"/>
                                </div>
                              )}
                              <div className="absolute top-1.5 left-1.5 bg-white/90 rounded-lg p-0.5">
                                  {selectedResultIdx === idx ? <CheckCircle size={14} className="text-orange-600"/> : <span className="text-[10px] font-black px-1.5 font-display">{idx+1}</span>}
                              </div>
                          </motion.button>
                      ))}
                      
                      {/* BATCH DOWNLOAD ALL */}
                      <motion.button 
                        whileHover={{ y: -4 }}
                        onClick={() => results.forEach((_, i) => handleDownload(i))}
                        className="min-w-[100px] h-24 rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex flex-col items-center justify-center text-orange-600 hover:bg-orange-100 transition-all gap-2 shrink-0 group"
                      >
                          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <Download size={18}/>
                          </div>
                          <span className="text-[10px] font-extrabold tracking-tight font-display">TẢI TẤT CẢ</span>
                      </motion.button>
                  </div>
               </div>
            ) : !isGenerating && (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-slate-200/50 border border-slate-100 relative"
                  >
                     <User size={56} className="text-slate-200" />
                     <div className="absolute -bottom-2 -right-2 bg-orange-500 p-3 rounded-2xl border-4 border-white shadow-lg text-white">
                        <Shirt size={20} />
                     </div>
                  </motion.div>
                  <h2 className="font-extrabold text-2xl text-slate-800 tracking-tight font-display">Studio Sẵn Sàng</h2>
                  <p className="text-sm mt-3 max-w-sm text-slate-500 font-medium leading-relaxed font-body">
                      Tải ảnh của bạn lên để tạo ra những bộ hình thời trang chuyên nghiệp với 3 biến thể độc đáo cùng lúc.
                  </p>
                  
                  <div className="mt-8 flex gap-3">
                      <div className="px-4 py-2 bg-slate-200/50 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest font-display">Tỷ lệ 3:4</div>
                      <div className="px-4 py-2 bg-slate-200/50 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest font-display">Chất lượng HDR</div>
                  </div>
               </div>
            )}
          </div>
      </div>
    </motion.div>
  );
};

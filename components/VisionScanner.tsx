import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { marked } from 'marked';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, X, FileText, Table, 
  Wand2, Languages, AlertTriangle, 
  Loader2, Copy, Check, ScanEye, FileCode,
  Key, ExternalLink, Sparkles
} from 'lucide-react';

interface VisionScannerProps {
  apiKey?: string;
  onApiKeyUpdate?: (key: string) => void;
}

export const VisionScanner: React.FC<VisionScannerProps> = ({ apiKey: propApiKey, onApiKeyUpdate }) => {
  const [image, setImage] = useState<{base64: string, mimeType: string} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Trích xuất toàn bộ nội dung văn bản trong hình ảnh này. Giữ nguyên định dạng gốc.");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Vui lòng chỉ tải lên tệp hình ảnh.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      // Extract base64 part
      const base64 = result.split(',')[1];
      setImage({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setPromptType = (type: 'ocr' | 'table' | 'summary' | 'translate') => {
    switch (type) {
      case 'ocr':
        setPrompt("Trích xuất toàn bộ nội dung văn bản trong hình ảnh này. Giữ nguyên định dạng gốc, xuống dòng đúng chỗ.");
        break;
      case 'table':
        setPrompt("Hãy xác định bảng trong hình ảnh và trích xuất dữ liệu đó dưới dạng Markdown Table. Nếu có số liệu, hãy giữ chính xác.");
        break;
      case 'summary':
        setPrompt("Hãy phân tích hình ảnh và tóm tắt những ý chính quan trọng nhất. Nếu là văn bản dài, hãy gạch đầu dòng các điểm cốt lõi.");
        break;
      case 'translate':
        setPrompt("Dịch toàn bộ văn bản trong hình ảnh này sang Tiếng Việt. Trình bày rõ ràng.");
        break;
    }
  };

  const analyzeImage = async (keyToUse?: string) => {
    if (!image) {
      setError("Vui lòng chọn hình ảnh trước khi phân tích.");
      return;
    }

    const currentApiKey = keyToUse || propApiKey || process.env.GEMINI_API_KEY || "";
    if (!currentApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult("");

    try {
      // Initialize Gemini Client using the passed apiKey or fallback
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      
      const response = await ai.models.generateContent({
        // Use gemini-3-flash-preview for vision/multimodal tasks
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64
              }
            }
          ]
        }
      });

      const text = response.text || "Không có kết quả trả về.";
      setResult(text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối với Gemini AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) {
      alert("Vui lòng nhập API Key");
      return;
    }
    const cleanKey = tempApiKey.trim();
    localStorage.setItem('geminiApiKey', cleanKey);
    if (onApiKeyUpdate) onApiKeyUpdate(cleanKey);
    setShowApiKeyModal(false);
    analyzeImage(cleanKey);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 h-full overflow-y-auto custom-scrollbar"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
        
        {/* Left Column: Input Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-orange-100">
            {/* Header */}
            <div className="bg-orange-600 p-4">
              <h1 className="text-xl font-bold flex items-center gap-2 text-white uppercase font-display">
                <ScanEye className="w-6 h-6 text-white" />
                AI Vision Scanner
              </h1>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-slate-500 mb-6 text-sm font-body">
                Trích xuất văn bản, bảng biểu và dữ liệu từ hình ảnh bằng Gemini AI.
              </p>

              {/* Upload Area */}
              <div className="mb-6">
                <label className="text-sm font-bold text-slate-700 mb-2 block font-display">Hình ảnh cần xử lý</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all relative group
                    ${previewUrl ? 'border-orange-400 bg-orange-50' : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50'}`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  {!previewUrl ? (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-orange-400 mb-3 transition-colors" />
                      <span className="text-sm text-slate-600 font-medium font-body">Nhấn để tải ảnh hoặc kéo thả vào đây</span>
                      <p className="text-xs text-slate-400 mt-1 font-body">Hỗ trợ PNG, JPG, WEBP</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-h-64 mx-auto rounded-lg shadow-sm object-contain" 
                      />
                      <button 
                        onClick={removeImage}
                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 block font-display">Bạn muốn làm gì?</label>
                
                <div className="flex flex-wrap gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPromptType('ocr')} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 text-xs rounded-full transition font-medium border border-slate-200 flex items-center gap-1.5 font-display"
                  >
                    <FileText className="w-3.5 h-3.5" /> Lấy Text
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPromptType('table')} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-700 text-xs rounded-full transition font-medium border border-slate-200 flex items-center gap-1.5 font-display"
                  >
                    <Table className="w-3.5 h-3.5" /> Xuất Bảng
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPromptType('summary')} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 text-xs rounded-full transition font-medium border border-slate-200 flex items-center gap-1.5 font-display"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Tóm tắt
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPromptType('translate')} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 text-xs rounded-full transition font-medium border border-slate-200 flex items-center gap-1.5 font-display"
                  >
                    <Languages className="w-3.5 h-3.5" /> Dịch Việt
                  </motion.button>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none h-24 font-body bg-slate-50"
                  placeholder="Nhập yêu cầu cụ thể..."
                />

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start gap-2 font-body overflow-hidden"
                    >
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => analyzeImage()}
                  disabled={loading || !image}
                  className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg font-display
                    ${loading || !image 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                      : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 shadow-orange-200'}`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanEye className="w-5 h-5" />}
                  {loading ? 'Đang Phân Tích...' : 'Phân Tích Ngay'}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Result */}
        <div className="flex flex-col h-full min-h-[500px] bg-white rounded-xl shadow-md border border-orange-100 overflow-hidden">
          {/* Header */}
          <div className="bg-orange-600 p-4 border-b border-orange-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase font-display">
              <FileCode className="w-5 h-5 text-white" /> Kết Quả
            </h2>
            <button 
              onClick={handleCopy}
              disabled={!result}
              className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-all font-medium border font-display
                ${isCopied 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'}`}
            >
              {isCopied ? <><Check className="w-3 h-3"/> Đã chép</> : <><Copy className="w-3 h-3"/> Sao chép</>}
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-orange-500" />
                <p className="text-sm font-medium animate-pulse font-body">Gemini đang đọc hình ảnh...</p>
              </div>
            ) : result ? (
              <div 
                className="prose prose-sm prose-slate max-w-none font-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(result) as string }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <ScanEye className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm font-medium font-body">Kết quả phân tích sẽ hiển thị ở đây</p>
              </div>
            )}
          </div>
        </div>

      </div>

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
                    <Key className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Nhập Gemini API Key</h3>
                </div>
                <button onClick={() => setShowApiKeyModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8">
                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                  Để sử dụng tính năng AI Vision Scanner, bạn cần nhập Gemini API Key. Khóa này sẽ được lưu an toàn trong trình duyệt của bạn.
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
    </motion.div>
  );
};

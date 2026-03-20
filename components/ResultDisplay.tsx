import React, { useState, useEffect } from 'react';
import { Film, PlayCircle, Sparkles, Copy, Video, Download, Music, Volume2, Image as ImageIcon, Loader2, UserCircle, MapPin, Images, FileText, RefreshCw, Trash2, Plus, Edit2, ArrowLeft, Key, X, ExternalLink } from 'lucide-react';
import JSZip from 'jszip';
import { GeneratedData, Character, VeoPrompt, ScriptLine, ScriptTone } from '../types';
import { generateImage } from '../services/geminiService';

interface ResultDisplayProps {
  data: GeneratedData;
  characters: Character[];
  styleId: string;
  characterStyles: Record<string, string>;
  apiKey?: string;
  onApiKeyUpdate?: (key: string) => void;
  projectInputs?: any;
  onReset: () => void;
  onBack: () => void;
}

interface PromptCardProps {
  item: VeoPrompt;
  idx: number;
  characters: Character[];
  generatedImage: string | null;
  scriptTone?: ScriptTone;
  onGenerateImage: (prompt: string, idx: number) => void | Promise<void>;
}

const MessageCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const PromptCard: React.FC<PromptCardProps> = ({ 
  item, 
  idx, 
  characters,
  generatedImage,
  scriptTone,
  onGenerateImage 
}) => {
  const [activeFocus, setActiveFocus] = useState<string>('original');
  const [context, setContext] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  const activeChars = characters.filter(c => c.name.trim() !== '');

  const getActivePrompt = () => {
    if (activeFocus === 'original') return item.prompt;
    const focusChar = activeChars.find(c => c.name === activeFocus);
    if (focusChar) {
      return `Wholesome close-up shot of ${focusChar.name}, ${focusChar.voiceGender} aged ${focusChar.voiceAge}. Friendly and professional expression. Original Scene Context: ${item.prompt}`;
    }
    return item.prompt;
  };

  const activePromptText = getActivePrompt();

  const handleGenerateClick = async () => {
    setLoadingImage(true);
    
    const castSummary = activeChars.map(c => `${c.name} (${c.voiceGender}, age ${c.voiceAge}, ${c.description})`).join(' and ');
    const mood = scriptTone?.label || 'natural and friendly';

    // Using "wholesome", "safe", "friendly" keywords to prevent triggering minor safety filters
    const finalPrompt = `
      Professional wholesome cinematic scene: ${activePromptText}. 
      Cast: ${castSummary}. 
      Mood: ${mood}. 
      Environment: ${context || 'bright and clean cinematic background'}. 
      Safe and family-friendly performance for dialogue: "${item.dialogue_segment}".
    `.trim().replace(/\s+/g, ' '); 
    
    await onGenerateImage(finalPrompt, idx);
    setLoadingImage(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all break-inside-avoid">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wide print:border print:border-orange-200">
            Shot {idx + 1}: {item.type}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">8 giây / ~20 từ</span>
        </div>
        <button
          onClick={() => copyToClipboard(activePromptText)}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-orange-600 transition-colors no-print"
          title="Sao chép Prompt"
        >
          <Copy size={16} />
        </button>
      </div>

      <div className="flex gap-2 mb-3 no-print overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFocus('original')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${activeFocus === 'original' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          <Video size={12} /> Cảnh chung
        </button>
        {activeChars.map((char) => (
          <button
            key={char.name}
            onClick={() => setActiveFocus(char.name)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              activeFocus === char.name 
                ? 'bg-orange-600 text-white border-orange-600' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50'
            }`}
          >
            <UserCircle size={12} /> {char.name}
          </button>
        ))}
      </div>

      {item.dialogue_segment && (
        <div className="mb-3 bg-orange-50 border border-orange-100 rounded-lg p-2.5 flex items-start gap-2">
           <div className="mt-0.5"><MessageCircle size={14} className="text-orange-600"/></div>
           <div>
             <span className="text-xs font-bold text-orange-700 block mb-0.5">Thoại Tiếng Việt (8s):</span>
             <p className="text-sm text-orange-900 italic leading-snug">"{item.dialogue_segment}"</p>
           </div>
        </div>
      )}

      <div className="mb-3 no-print">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={12} className="text-slate-400" />
          <label className="text-xs font-medium text-slate-500">Bối cảnh / Mô tả thêm:</label>
        </div>
        <textarea
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[50px] bg-slate-50 focus:bg-white transition-colors"
          placeholder="Nhập bối cảnh (VD: Đường phố đông đúc, có xe chạy phía sau...)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-sm text-slate-600 leading-relaxed break-words print:bg-white print:border-slate-300 relative group">
        {activePromptText}
      </div>

      <div className="mt-4 no-print">
         {generatedImage ? (
           <div className="relative rounded-lg overflow-hidden border border-slate-200 group bg-slate-100 flex justify-center">
             <img src={generatedImage} alt="Generated Preview" className="h-auto w-full max-w-[250px] object-cover shadow-sm" />
             <button 
               onClick={() => handleGenerateClick()}
               disabled={loadingImage}
               className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 p-2 rounded-lg shadow-sm border border-slate-200 transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
               title="Tạo lại ảnh này"
             >
                {loadingImage ? (
                  <Loader2 size={18} className="animate-spin text-orange-600" />
                ) : (
                  <RefreshCw size={18} />
                )}
             </button>
           </div>
         ) : (
           <button 
            onClick={() => handleGenerateClick()}
            disabled={loadingImage}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 font-medium text-sm flex items-center justify-center gap-2 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-all"
           >
             {loadingImage ? (
               <Loader2 size={18} className="animate-spin" />
             ) : (
               <ImageIcon size={18} />
             )}
             {loadingImage ? "Đang tạo ảnh an toàn..." : "Tạo ảnh minh họa (Wholesome AI)"}
           </button>
         )}
      </div>
    </div>
  );
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, characters, styleId, characterStyles, apiKey: propApiKey, onApiKeyUpdate, projectInputs, onReset, onBack }) => {
  const [localData, setLocalData] = useState<GeneratedData>(data);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: 'single' | 'batch', prompt?: string, idx?: number } | null>(null);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const activeChars = characters.filter(c => c.name.trim() !== '');

  const handleScriptChange = (index: number, field: keyof ScriptLine, value: string) => {
    const newScript = [...localData.script];
    newScript[index] = { ...newScript[index], [field]: value };
    setLocalData(prev => ({ ...prev, script: newScript }));
  };

  const handleDeleteLine = (index: number) => {
    const newScript = localData.script.filter((_, i) => i !== index);
    setLocalData(prev => ({ ...prev, script: newScript }));
  };

  const handleAddLine = () => {
    const newScript = [...localData.script, { character: activeChars[0]?.name || "Character", dialogue: "Nhập lời thoại mới...", action: "Mô tả hành động..." }];
    setLocalData(prev => ({ ...prev, script: newScript }));
  };

  const getSafeFilename = (suffix: string, ext: string) => {
    const safeTitle = localData.title
      ? localData.title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") 
          .replace(/[^a-z0-9]/gi, '-') 
          .replace(/-+/g, '-') 
          .replace(/^-|-$/g, '') 
          .toLowerCase()
      : 'nam-le-ai';
    return `${safeTitle}-${suffix}.${ext}`;
  };

  const handleSingleImageGeneration = async (prompt: string, idx: number, keyToUse?: string) => {
    const currentApiKey = keyToUse || propApiKey || process.env.GEMINI_API_KEY || "";
    if (!currentApiKey) {
      setPendingAction({ type: 'single', prompt, idx });
      setShowApiKeyModal(true);
      return;
    }

    try {
      const referenceImages = activeChars.map(c => c.image).filter(img => img !== null) as string[];
      const base64Image = await generateImage(prompt, referenceImages, styleId, characterStyles, currentApiKey);
      
      setGeneratedImages(prev => ({
        ...prev,
        [idx]: base64Image
      }));
    } catch (error) {
      console.error(`Failed to generate image for index ${idx}:`, error);
    }
  };

  const handleBatchGenerateImages = async (keyToUse?: string) => {
    const currentApiKey = keyToUse || propApiKey || process.env.GEMINI_API_KEY || "";
    if (!currentApiKey) {
      setPendingAction({ type: 'batch' });
      setShowApiKeyModal(true);
      return;
    }

    setIsBatchGenerating(true);
    const pendingIndices = localData.veo_prompts.map((_, i) => i).filter(i => !generatedImages[i]);
    
    if (pendingIndices.length === 0) {
       setIsBatchGenerating(false);
       return;
    }

    const chunkSize = 2;
    for (let i = 0; i < pendingIndices.length; i += chunkSize) {
      const chunk = pendingIndices.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (idx) => {
        const item = localData.veo_prompts[idx];
        const castSummary = activeChars.map(c => `${c.name} (${c.voiceGender}, age ${c.voiceAge})`).join(' and ');
        const promptForAI = `Wholesome cinematic scene: ${item.prompt}. Cast: ${castSummary}. The character is speaking this Vietnamese dialogue in a friendly way: "${item.dialogue_segment}".`.replace(/\s+/g, ' '); 
        
        await handleSingleImageGeneration(promptForAI, idx, currentApiKey);
      }));
      if (i + chunkSize < pendingIndices.length) {
        await new Promise(r => setTimeout(r, 800));
      }
    }
    setIsBatchGenerating(false);
  };

  const handleDownloadAllImages = async () => {
    const indices = Object.keys(generatedImages);
    if (indices.length === 0) {
      alert("Chưa có ảnh nào được tạo. Vui lòng tạo ảnh trước.");
      return;
    }
    try {
      const zip = new JSZip();
      const sortedIndices = indices.map(Number).sort((a, b) => a - b);
      sortedIndices.forEach((idx) => {
        const base64Data = generatedImages[idx];
        if (base64Data) {
          const data = base64Data.split(',')[1]; 
          const fileName = `scene-${String(idx + 1).padStart(2, '0')}.png`;
          zip.file(fileName, data, { base64: true });
        }
      });
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = getSafeFilename('images', 'zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating zip file:", error);
      alert("Không thể tạo file nén. Vui lòng thử lại.");
    }
  };

  const handleDownloadTxt = () => {
    let content = "";
    localData.veo_prompts.forEach((p) => {
      content += `${p.prompt}\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeFilename('prompts', 'txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadJson = () => {
    const payload = {
      generatedData: localData,
      inputs: {
        characters,
        styleId,
        characterStyles,
        ...projectInputs
      }
    };
    
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeFilename('full-project', 'json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    
    if (pendingAction?.type === 'single' && pendingAction.prompt !== undefined && pendingAction.idx !== undefined) {
      handleSingleImageGeneration(pendingAction.prompt, pendingAction.idx, cleanKey);
    } else if (pendingAction?.type === 'batch') {
      handleBatchGenerateImages(cleanKey);
    }
    setPendingAction(null);
  };

  return (
    <div className="animate-fadeInSlideUp">
      <div className="mb-8 flex items-center justify-between no-print flex-wrap gap-3">
        <div className="w-full lg:w-auto">
          <input
            value={localData.title}
            onChange={(e) => setLocalData(prev => ({...prev, title: e.target.value}))}
            className="text-3xl font-bold text-slate-900 mb-2 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-500 focus:outline-none w-full"
          />
          <textarea
            value={localData.synopsis}
            onChange={(e) => setLocalData(prev => ({...prev, synopsis: e.target.value}))}
            className="text-slate-500 max-w-2xl bg-transparent border border-transparent hover:border-slate-200 focus:border-orange-500 focus:outline-none w-full rounded-lg p-1 resize-none"
            rows={2}
          />
        </div>
        <div className="flex flex-wrap gap-2">
           <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600 flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Quay lại chỉnh sửa
          </button>
           <button
            onClick={handleDownloadTxt}
            className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 font-medium flex items-center gap-2"
          >
            <FileText size={16} />
            Tải Prompt (.txt)
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600 flex items-center gap-2"
          >
            <Download size={16} />
            Lưu Project (JSON)
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600"
          >
            Tạo mới
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-4xl font-bold text-slate-900">{localData.title}</h1>
        <p className="text-xl text-slate-600 mt-2">{localData.synopsis}</p>
        <div className="mt-4 text-sm text-slate-400">Generated by NAM LÊ AI</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 print:grid-cols-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full print:shadow-none print:border-none">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center print:bg-white print:px-0">
            <h3 className="font-bold flex items-center gap-2 text-slate-800 text-lg">
              <Film size={20} className="text-orange-600" />
              Kịch bản Chi tiết
            </h3>
            <div className="flex gap-2">
              <span className="text-xs text-slate-400 font-medium self-center no-print mr-2 flex items-center gap-1">
                <Edit2 size={12}/> Chế độ chỉnh sửa
              </span>
              <button 
                onClick={() => copyToClipboard(localData.script.map(l => `${l.character}: ${l.dialogue} (${l.action})`).join('\n'))}
                className="text-xs text-orange-600 font-medium hover:underline no-print"
              >
                Sao chép toàn bộ
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto max-h-[800px] print:overflow-visible print:max-h-none print:px-0">
            {localData.script.map((line, idx) => {
              const charIndex = activeChars.findIndex(c => line.character.toLowerCase().includes(c.name.toLowerCase().split(' ')[0] || 'xxxx'));
              const colors = [
                'bg-orange-100 text-orange-600', 
                'bg-amber-100 text-amber-600', 
                'bg-orange-50 text-orange-500', 
                'bg-yellow-100 text-yellow-600'
              ];
              const colorClass = charIndex !== -1 ? colors[charIndex % colors.length] : colors[idx % colors.length];

              return (
                <div key={idx} className="flex gap-4 group break-inside-avoid relative">
                  <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg shadow-sm print:border print:border-slate-200 ${colorClass}`}>
                    {line.character.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <input 
                        className="font-bold text-slate-800 bg-transparent focus:bg-slate-50 border border-transparent hover:border-slate-200 focus:border-orange-300 rounded px-1 outline-none w-full"
                        value={line.character}
                        onChange={(e) => handleScriptChange(idx, 'character', e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <textarea
                        className="w-full bg-slate-50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-slate-700 leading-relaxed border border-slate-100 hover:border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-all outline-none resize-none print:bg-white print:border-slate-200 print:p-2"
                        rows={Math.max(2, Math.ceil(line.dialogue.length / 50))}
                        value={line.dialogue}
                        onChange={(e) => handleScriptChange(idx, 'dialogue', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <PlayCircle size={12} className="text-slate-400 print:hidden shrink-0" />
                      <input
                        className="text-sm text-slate-500 italic bg-transparent border border-transparent hover:border-slate-200 focus:border-orange-300 rounded px-1 outline-none w-full"
                        value={line.action}
                        onChange={(e) => handleScriptChange(idx, 'action', e.target.value)}
                        placeholder="Mô tả hành động..."
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteLine(idx)}
                    className="absolute -right-2 top-0 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 no-print"
                    title="Xóa dòng này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            
            <button
              onClick={handleAddLine}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-medium text-sm flex items-center justify-center gap-2 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-all no-print"
            >
              <Plus size={18} /> Thêm dòng thoại
            </button>
          </div>
        </div>

        <div className="space-y-6 print:break-before-page">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-sm print:bg-white print:border-slate-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-amber-900">
              <Music size={20} className="text-amber-600" />
              Thiết kế Âm thanh (Sound Design)
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                 <div className="bg-white p-2 rounded-lg shadow-sm text-amber-500 border border-amber-100">
                    <Music size={20} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Nhạc nền (BGM)</h4>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">{localData.sound_design?.music || "Chưa có đề xuất nhạc nền."}</p>
                 </div>
              </div>
              <div className="h-px bg-amber-200 w-full opacity-50"></div>
              <div className="flex gap-4 items-start">
                 <div className="bg-white p-2 rounded-lg shadow-sm text-orange-500 border border-orange-100">
                    <Volume2 size={20} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Hiệu ứng (SFX)</h4>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">{localData.sound_design?.sfx || "Chưa có đề xuất hiệu ứng."}</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg print:bg-white print:text-black print:border print:border-slate-200 print:shadow-none">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 print:text-black">
                  <Sparkles className="text-yellow-400 print:text-black" />
                  NAM LÊ AI Video Prompts
                </h3>
                <p className="text-orange-200 text-sm print:text-slate-600 max-w-sm">
                  Kịch bản đã được tối ưu cho các đoạn 8 giây (~20 từ). Đã kích hoạt bộ lọcWholesome an toàn.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-orange-800 no-print">
               <button
                 onClick={() => handleBatchGenerateImages()}
                 disabled={isBatchGenerating}
                 className="flex-1 py-2 px-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
               >
                 {isBatchGenerating ? <Loader2 size={16} className="animate-spin"/> : <Images size={16} />}
                 {isBatchGenerating ? `Đang tạo ${Object.keys(generatedImages).length}/${localData.veo_prompts.length}...` : "Tạo ảnh hàng loạt (An toàn)"}
               </button>
               <button
                 onClick={handleDownloadAllImages}
                 className="py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                 title="Tải xuống tất cả ảnh đã tạo (.zip)"
               >
                 <Download size={16} />
               </button>
            </div>
          </div>

          {localData.veo_prompts.map((item, idx) => (
            <PromptCard 
              key={idx} 
              item={item} 
              idx={idx} 
              characters={characters} 
              generatedImage={generatedImages[idx] || null}
              scriptTone={projectInputs?.scriptTone}
              onGenerateImage={handleSingleImageGeneration}
            />
          ))}

          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3 items-start no-print">
            <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1">
              <Video size={16} />
            </div>
            <div>
              <h4 className="font-bold text-green-800 text-sm">Lưu ý cho Google Veo</h4>
              <p className="text-xs text-green-700 mt-1">
                Veo hoạt động tốt nhất với các đoạn clip 8 giây. Kịch bản của bạn đã được chia nhỏ chính xác để khớp với khẩu hình và biểu cảm trong khoảng thời gian này.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeInSlideUp">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Nhập Gemini API Key</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            <div className="p-8">
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                Để sử dụng tính năng AI Vẽ ảnh minh họa, bạn cần nhập Gemini API Key. Khóa này sẽ được lưu an toàn trong trình duyệt của bạn.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">API Key của bạn</label>
                  <input 
                    type="password" 
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="Dán API Key tại đây..."
                    autoFocus
                  />
                </div>

                <a 
                  href="https://aistudio.google.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-50 text-orange-700 rounded-2xl text-sm font-bold border border-orange-100 hover:bg-orange-100 transition-colors"
                >
                  Lấy API Key miễn phí tại đây
                </a>

                <button 
                  onClick={handleSaveApiKey}
                  className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 mt-4"
                >
                  Tiếp tục tạo ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
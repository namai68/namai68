import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Zap,
  BookOpen,
  ChevronRight,
  Loader2,
  Lightbulb,
  Clapperboard,
  Scissors,
  Send,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Clock,
  Sparkle,
  Zap as ZapIcon,
  Shirt
} from 'lucide-react';
import { suggestIdeas, generateScreenplay, breakdownScenes, generateFinalPrompt } from '../services/promptService';
import { CinematicPrompt, Screenplay, IdeaSuggestion, Episode, Scene, Character } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHARACTER_COLORS = [
  'bg-orange-500', 
  'bg-blue-500', 
  'bg-purple-500', 
  'bg-emerald-500', 
  'bg-rose-500', 
  'bg-amber-500', 
  'bg-indigo-500', 
  'bg-cyan-500'
];

const MAIN_CHARACTER_NAMES = [
  'lê tuấn', 'đình thược', 'ngân thơm', 'hà út', 'tuyết mai', 'sato', 'tuấn', 'thược', 'thơm', 'út', 'mai'
];

const detectCharacters = (text: string, existingCharacters: Character[] = []): Character[] => {
  const characters: Character[] = [...existingCharacters];
  const lowerText = text.toLowerCase();
  
  // 1. Tìm theo định dạng [Tên] hoặc @1 (Tên)
  const regex = /(?:@(\d+)\s*\(([^)]+)\)|\[([^\]]+)\])/g;
  let match;
  let idCounter = characters.length + 1;
  
  while ((match = regex.exec(text)) !== null) {
    const id = match[1] || String(idCounter++);
    const name = (match[2] || match[3]).trim();
    
    // Tìm mô tả ngay sau tên nhân vật (ví dụ: [Tên] - mô tả)
    const remainingText = text.substring(regex.lastIndex);
    const descMatch = remainingText.match(/^\s*-\s*([^.\n,\[]+)/);
    const description = descMatch ? descMatch[1].trim() : undefined;
    
    const existing = characters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      addCharacter(name, id, characters, description);
    } else if (description && !existing.description) {
      existing.description = description;
    }
  }

  // 2. Tìm theo danh sách tên nhân vật chính (nếu chưa được tìm thấy)
  MAIN_CHARACTER_NAMES.forEach(mainName => {
    if (lowerText.includes(mainName)) {
      if (!characters.find(c => c.name.toLowerCase().includes(mainName))) {
        // Tìm tên đầy đủ trong text nếu có thể
        const startIdx = lowerText.indexOf(mainName);
        // Giả định tên dài khoảng 2-4 từ
        const rawName = text.substring(startIdx, startIdx + 20).split(/[.,!?;:\n]/)[0].trim();
        addCharacter(rawName || mainName, String(idCounter++), characters);
      }
    }
  });
  
  return characters;
};

const addCharacter = (name: string, id: string, characters: Character[], description?: string) => {
  const lowerName = name.toLowerCase();
  let gender: 'male' | 'female' = 'male';
  const femaleMarkers = ['thị', 'mai', 'lan', 'hồng', 'tuyết', 'ngọc', 'linh', 'trang', 'thảo', 'phương', 'hạnh', 'hiền', 'anh', 'nhi', 'vy', 'quỳnh', 'ngân', 'thom'];
  const maleMarkers = ['văn', 'tuấn', 'hùng', 'dũng', 'cường', 'minh', 'nam', 'sơn', 'hải', 'long', 'thành', 'trung', 'kiên', 'hoàng', 'huy', 'đức', 'việt', 'thược'];

  const isFemale = femaleMarkers.some(m => lowerName.includes(m));
  const isMale = maleMarkers.some(m => lowerName.includes(m));

  if (isFemale && !isMale) gender = 'female';
  else if (isMale) gender = 'male';
  
  const isMain = MAIN_CHARACTER_NAMES.some(mainName => lowerName.includes(mainName));
  
  characters.push({
    id,
    name,
    role: isMain ? 'Chính' : 'Phụ',
    gender,
    isMain,
    useCameoOutfit: isMain,
    color: CHARACTER_COLORS[characters.length % CHARACTER_COLORS.length],
    description
  } as Character);
};

interface JimengAIProps {
  apiKey?: string;
}

const JimengAI: React.FC<JimengAIProps> = ({ apiKey }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Idea
  const [idea, setIdea] = useState('');
  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>([]);
  
  // Step 2: Screenplay
  const [numEpisodes, setNumEpisodes] = useState(6);
  const [durationPerEpisode, setDurationPerEpisode] = useState(1);
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const screenplayRef = useRef<Screenplay | null>(null);
  
  useEffect(() => {
    screenplayRef.current = screenplay;
  }, [screenplay]);
  
  // Step 3: Breakdown
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
  
  // Step 4: Final Prompts
  const [copied, setCopied] = useState<string | null>(null);

  const handleSuggestIdeas = async () => {
    setLoading(true);
    try {
      const res = await suggestIdeas(apiKey);
      setSuggestions(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScreenplay = async () => {
    if (!idea) return;
    setLoading(true);
    try {
      const res = await generateScreenplay(idea, numEpisodes, durationPerEpisode, apiKey);
      setScreenplay({
        ...res,
        intensityLevel: 'action-drama' // Default
      });
      setStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdown = async (episodeId: number) => {
    if (!screenplay) return;
    const ep = screenplay.episodes.find(e => e.id === episodeId);
    if (!ep) return;
    
    // Get context from previous episode
    const prevEp = screenplay.episodes.find(e => e.id === episodeId - 1);
    const previousContext = prevEp ? prevEp.summary : "Đây là tập đầu tiên.";

    setLoading(true);
    setActiveEpisodeId(episodeId);
    try {
      const numScenes = Math.ceil((ep.duration * 60) / 12);
      const scenes = await breakdownScenes(ep.summary, numScenes, previousContext, screenplay.intensityLevel, apiKey);
      
      // Automatically detect characters for each scene
      const scenesWithCharacters: Scene[] = scenes.map(s => ({
        ...s,
        characters: detectCharacters(s.description)
      }));
      
      const updatedEpisodes = screenplay.episodes.map(e => 
        e.id === episodeId ? { ...e, scenes: scenesWithCharacters } : e
      );
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
      setStep(3);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    if (!screenplay || activeEpisodeId === null) return;
    const ep = screenplay.episodes.find(e => e.id === activeEpisodeId);
    if (!ep) return;

    // Generate prompts for all scenes that don't have one yet or just all of them
    const scenesToProcess = ep.scenes;
    
    setLoading(true);
    try {
      for (const scene of scenesToProcess) {
        // Skip if already generating
        if (scene.loading) continue;
        
        await handleGeneratePrompt(activeEpisodeId, scene.id);
        // Small delay to prevent API rate limiting and allow state to settle
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOverallPlot = (value: string) => {
    if (!screenplay) return;
    setScreenplay({ ...screenplay, overallPlot: value });
  };

  const updateIntensityLevel = (level: 'storytelling' | 'action-drama' | 'hardcore') => {
    if (!screenplay) return;
    setScreenplay({ ...screenplay, intensityLevel: level });
  };

  const updateEpisode = (id: number, field: 'title' | 'summary' | 'duration', value: any) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(ep => 
      ep.id === id ? { ...ep, [field]: value } : ep
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const toggleCharacterCameoOutfit = (episodeId: number, sceneId: string, characterId: string) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(e => 
      e.id === episodeId ? {
        ...e,
        scenes: e.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          characters: s.characters?.map(c => c.id === characterId ? { ...c, useCameoOutfit: !c.useCameoOutfit } : c)
        } : s)
      } : e
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const toggleCharacterGender = (episodeId: number, sceneId: string, characterId: string) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(e => 
      e.id === episodeId ? {
        ...e,
        scenes: e.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          characters: s.characters?.map((c: Character): Character => c.id === characterId ? { ...c, gender: (c.gender === 'male' ? 'female' : 'male') as 'male' | 'female' } : c)
        } : s)
      } : e
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const handleGeneratePrompt = async (episodeId: number, sceneId: string) => {
    const currentScreenplay = screenplayRef.current;
    if (!currentScreenplay) return;
    const ep = currentScreenplay.episodes.find(e => e.id === episodeId);
    if (!ep) return;
    const scene = ep.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Set loading state for specific scene
    const updateSceneLoading = (isLoading: boolean) => {
      setScreenplay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => 
            e.id === episodeId ? {
              ...e,
              scenes: e.scenes.map(s => s.id === sceneId ? { ...s, loading: isLoading, progress: isLoading ? 0 : 100 } : s)
            } : e
          )
        };
      });
    };

    updateSceneLoading(true);

    // Simulated progress timer
    const progressInterval = setInterval(() => {
      setScreenplay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => 
            e.id === episodeId ? {
              ...e,
              scenes: e.scenes.map(s => {
                if (s.id === sceneId && s.loading) {
                  // Increment progress slowly up to 99%
                  const currentProgress = s.progress || 0;
                  const increment = currentProgress < 30 ? 5 : currentProgress < 70 ? 2 : currentProgress < 95 ? 1 : 0.2;
                  const nextProgress = Math.min(99, currentProgress + increment);
                  return { ...s, progress: nextProgress };
                }
                return s;
              })
            } : e
          )
        };
      });
    }, 200);

    try {
      // Find previous scene for continuity
      const latestScreenplay = screenplayRef.current;
      if (!latestScreenplay) return;
      
      const currentEpisode = latestScreenplay.episodes.find(e => e.id === episodeId);
      let previousSceneDesc = undefined;
      let previousTechnicalPrompt = undefined;
      let isLateScene = false;
      
      if (currentEpisode) {
        const sceneIndex = currentEpisode.scenes.findIndex(s => s.id === sceneId);
        isLateScene = sceneIndex >= Math.floor(currentEpisode.scenes.length / 2);
        
        if (sceneIndex > 0) {
          const prevScene = currentEpisode.scenes[sceneIndex - 1];
          previousSceneDesc = prevScene.description;
          previousTechnicalPrompt = prevScene.finalPrompt?.prompt;
        } else {
          // If first scene of episode, check last scene of previous episode
          const prevEp = latestScreenplay.episodes.find(e => e.id === episodeId - 1);
          if (prevEp && prevEp.scenes.length > 0) {
            const lastScene = prevEp.scenes[prevEp.scenes.length - 1];
            previousSceneDesc = lastScene.description;
            previousTechnicalPrompt = lastScene.finalPrompt?.prompt;
          }
        }
      }

      // Layer 1: Global Story (Overall Plot + Summaries up to current episode)
      const episodeHistory = latestScreenplay.episodes
        .filter(e => e.id <= episodeId)
        .map(e => `Tập ${e.id}: ${e.summary}`)
        .join('\n');
      
      const globalStory = `KỊCH BẢN TỔNG THỂ: ${latestScreenplay.overallPlot}\n\nDIỄN BIẾN ĐẾN HIỆN TẠI:\n${episodeHistory}`;

      const res = await generateFinalPrompt(
        scene.description, 
        globalStory, 
        scene.characters || [], 
        latestScreenplay.intensityLevel,
        previousSceneDesc,
        previousTechnicalPrompt,
        isLateScene,
        apiKey
      );
      
      clearInterval(progressInterval);

      setScreenplay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          episodes: prev.episodes.map(e => 
            e.id === episodeId ? {
              ...e,
              scenes: e.scenes.map(s => s.id === sceneId ? { ...s, finalPrompt: res, loading: false, progress: 100 } : s)
            } : e
          )
        };
      });
    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      updateSceneLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const reset = () => {
    setStep(1);
    setIdea('');
    setSuggestions([]);
    setScreenplay(null);
    setActiveEpisodeId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-16 max-w-3xl mx-auto">
        {[
          { n: 1, label: 'Ý tưởng', icon: Lightbulb },
          { n: 2, label: 'Kịch bản', icon: Clapperboard },
          { n: 3, label: 'Chia cảnh', icon: Scissors },
          { n: 4, label: 'Xuất Prompt', icon: Send }
        ].map((s) => (
          <div key={s.n} className="flex flex-col items-center relative flex-1">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
              step >= s.n ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]" : "bg-white border-slate-200 text-slate-300"
            )}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em] mt-4",
              step >= s.n ? "text-orange-600" : "text-slate-400"
            )}>{s.label}</span>
            {s.n < 4 && (
              <div className={cn(
                "absolute top-6 left-[50%] w-full h-[1px] -z-0",
                step > s.n ? "bg-orange-200" : "bg-slate-100"
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: IDEA GENERATOR */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto space-y-12"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-orange-600 uppercase tracking-[0.4em]">BY NAM AI</span>
              </div>
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <Lightbulb className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Khởi tạo ý tưởng</h2>
                  <p className="text-orange-600/60 text-[10px] font-black uppercase tracking-[0.3em]">Bước 1: Idea Generator</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Nhập ý tưởng sơ khai của bạn
                  </label>
                  <textarea 
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Ví dụ: Một sát thủ gác kiếm bị truy đuổi..."
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none mb-8"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                        Số tập phim
                      </label>
                      <input 
                        type="number"
                        value={numEpisodes}
                        onChange={(e) => setNumEpisodes(parseInt(e.target.value) || 1)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                        Phút mỗi tập
                      </label>
                      <input 
                        type="number"
                        value={durationPerEpisode}
                        onChange={(e) => setDurationPerEpisode(parseInt(e.target.value) || 1)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSuggestIdeas}
                    disabled={loading}
                    className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-orange-500" />}
                    GỢI Ý Ý TƯỞNG
                  </button>
                  <button
                    onClick={handleGenerateScreenplay}
                    disabled={loading || !idea}
                    className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                  >
                    TIẾP THEO
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Xu hướng hành động hot</h3>
                {suggestions.map((s, i) => (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    onClick={() => setIdea(s.description)}
                    className="text-left p-6 bg-white border border-slate-200 rounded-2xl hover:border-orange-500/50 hover:bg-orange-50 transition-all group"
                  >
                    <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-orange-600 transition-colors">{s.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed font-light">{s.description}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: SCREENPLAY */}
        {step === 2 && screenplay && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-orange-600 uppercase tracking-[0.4em]">BY NAM AI</span>
              </div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <Clapperboard className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Kịch bản phân tập</h2>
                    <p className="text-orange-600/60 text-[10px] font-black uppercase tracking-[0.3em]">Bước 2: Screenplay Editor</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200">
                    <ArrowLeft className="w-5 h-5 text-orange-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Cốt truyện tổng thể</label>
                  <textarea 
                    value={screenplay.overallPlot}
                    onChange={(e) => updateOverallPlot(e.target.value)}
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['storytelling', 'action-drama', 'hardcore'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateIntensityLevel(level)}
                      className={cn(
                        "p-6 rounded-2xl border transition-all text-left group",
                        screenplay.intensityLevel === level 
                          ? "bg-orange-50 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]" 
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Zap className={cn(
                          "w-5 h-5",
                          screenplay.intensityLevel === level ? "text-orange-500" : "text-slate-300"
                        )} />
                        {screenplay.intensityLevel === level && (
                          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1",
                        screenplay.intensityLevel === level ? "text-orange-600" : "text-slate-400"
                      )}>
                        {level === 'storytelling' ? 'Bình thường' : level === 'action-drama' ? 'Kịch tính' : 'Hardcore'}
                      </p>
                      <p className="text-xs text-slate-500 font-light leading-relaxed">
                        {level === 'storytelling' ? 'Tập trung vào đối thoại và cảm xúc.' : level === 'action-drama' ? 'Cân bằng giữa cốt truyện và hành động.' : 'Hành động dồn dập, nhịp độ cực nhanh.'}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Danh sách tập phim</label>
                  <div className="grid grid-cols-1 gap-4">
                    {screenplay.episodes.map((ep) => (
                      <div key={ep.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:border-orange-300 transition-all group">
                        <div className="flex flex-col md:flex-row gap-8">
                          <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl font-bold text-slate-200">0{ep.id}</span>
                              <input 
                                value={ep.title}
                                onChange={(e) => updateEpisode(ep.id, 'title', e.target.value)}
                                className="bg-transparent border-none text-xl font-bold text-slate-800 focus:ring-0 p-0 w-full"
                                placeholder="Tiêu đề tập..."
                              />
                            </div>
                            <textarea 
                              value={ep.summary}
                              onChange={(e) => updateEpisode(ep.id, 'summary', e.target.value)}
                              rows={3}
                              className="bg-transparent border-none text-sm text-slate-600 focus:ring-0 p-0 w-full resize-none font-bold leading-relaxed"
                              placeholder="Tóm tắt nội dung tập này..."
                            />
                          </div>
                          <div className="md:w-48 flex flex-col justify-between items-end">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                              <Clock className="w-3 h-3 text-orange-500" />
                              <input 
                                type="number"
                                value={ep.duration}
                                onChange={(e) => updateEpisode(ep.id, 'duration', parseInt(e.target.value) || 1)}
                                className="bg-transparent border-none text-xs font-black text-orange-600 focus:ring-0 p-0 w-8 text-center"
                              />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phút</span>
                            </div>
                            <button 
                              onClick={() => handleBreakdown(ep.id)}
                              disabled={loading}
                              className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                            >
                              {loading && activeEpisodeId === ep.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                              CHIA CẢNH
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: SCENE BREAKDOWN */}
        {step === 3 && screenplay && activeEpisodeId !== null && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-orange-600 uppercase tracking-[0.4em]">BY NAM AI</span>
              </div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <Scissors className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Chia cảnh chi tiết</h2>
                    <p className="text-orange-600/60 text-[10px] font-black uppercase tracking-[0.3em]">Bước 3: Scene Breakdown — Tập {activeEpisodeId}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200">
                    <ArrowLeft className="w-5 h-5 text-orange-600" />
                  </button>
                  <button 
                    onClick={handleExportAll}
                    disabled={loading}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-orange-500" />}
                    TẠO TẤT CẢ
                  </button>
                  <button onClick={() => setStep(4)} className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">
                    XEM TỔNG HỢP
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {screenplay.episodes.find(e => e.id === activeEpisodeId)?.scenes.map((scene, idx) => (
                  <div key={scene.id} className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-10 group hover:border-orange-300 transition-all">
                    <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-4">
                        <span className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                          {idx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Cảnh quay chi tiết</h3>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Nhân vật:</span>
                          {scene.characters && scene.characters.length > 0 ? (
                            scene.characters.map(char => (
                              <div 
                                key={char.id} 
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all relative overflow-hidden",
                                  char.useCameoOutfit 
                                    ? "bg-orange-50 border-orange-200" 
                                    : "bg-white border-slate-200 opacity-80"
                                )}
                              >
                                {char.isMain && (
                                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500 text-[6px] font-black text-white rounded-bl-lg uppercase tracking-widest">
                                    Main
                                  </div>
                                )}
                                <div className={cn("w-2 h-2 rounded-full shrink-0", char.color)} />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">{char.name}</span>
                                  <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest">
                                    {char.isMain ? 'Nhân vật chính' : 'Nhân vật phụ'}
                                  </span>
                                </div>
                                <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" />
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => toggleCharacterGender(activeEpisodeId, scene.id, char.id!)}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                                      char.gender === 'male' 
                                        ? "bg-blue-50 text-blue-600 border-blue-200" 
                                        : "bg-rose-50 text-rose-600 border-rose-200"
                                    )}
                                  >
                                    {char.gender === 'male' ? 'NAM' : 'NỮ'}
                                  </button>
                                  <button 
                                    onClick={() => toggleCharacterCameoOutfit(activeEpisodeId, scene.id, char.id!)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                                      char.useCameoOutfit 
                                        ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" 
                                        : "bg-white text-slate-400 border-slate-200"
                                    )}
                                  >
                                    {char.useCameoOutfit ? (
                                      <>
                                        <ZapIcon className="w-2.5 h-2.5 fill-current" />
                                        CAMEO
                                      </>
                                    ) : (
                                      <>
                                        <Shirt className="w-2.5 h-2.5" />
                                        FREE
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <button 
                              onClick={() => {
                                const detected = detectCharacters(scene.description);
                                if (detected.length > 0) {
                                  const updatedEpisodes = screenplay.episodes.map(ep => 
                                    ep.id === activeEpisodeId ? {
                                      ...ep,
                                      scenes: ep.scenes.map(s => s.id === scene.id ? { ...s, characters: detected } : s)
                                    } : ep
                                  );
                                  setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                                }
                              }}
                              className="text-[9px] font-black text-orange-500 uppercase tracking-widest hover:underline"
                            >
                              Quét nhân vật
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (!screenplay || activeEpisodeId === null) return;
                              const updatedEpisodes = screenplay.episodes.map(ep => 
                                ep.id === activeEpisodeId ? {
                                  ...ep,
                                  scenes: ep.scenes.filter(s => s.id !== scene.id)
                                } : ep
                              );
                              setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                            }}
                            className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Mô tả hành động & bối cảnh</label>
                        <textarea 
                          value={scene.description}
                          onChange={(e) => {
                            const newDesc = e.target.value;
                            const updatedEpisodes = screenplay.episodes.map(ep => 
                              ep.id === activeEpisodeId ? {
                                ...ep,
                                scenes: ep.scenes.map(s => {
                                  if (s.id === scene.id) {
                                    const detected = detectCharacters(newDesc, s.characters);
                                    return { ...s, description: newDesc, characters: detected };
                                  }
                                  return s;
                                })
                              } : ep
                            );
                            setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                          }}
                          className="w-full p-6 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-orange-500 outline-none text-sm h-[200px] resize-none font-light leading-relaxed"
                        />
                        <button 
                          onClick={() => handleGeneratePrompt(activeEpisodeId, scene.id)}
                          disabled={scene.loading}
                          className="w-full py-5 text-sm bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 text-white font-black uppercase tracking-[0.3em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                        >
                          {scene.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          TẠO PROMPT V2 (NEW)
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Kết quả Prompt (Jimeng/Veo)</label>
                          {scene.finalPrompt && (
                            <button 
                              onClick={() => copyToClipboard(scene.finalPrompt!.chinesePrompt, scene.id)}
                              className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-widest hover:text-orange-700 transition-colors"
                            >
                              {copied === scene.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === scene.id ? 'ĐÃ COPY' : 'COPY PROMPT'}
                            </button>
                          )}
                        </div>
                        
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 h-[400px] overflow-y-auto relative custom-scrollbar">
                          {!scene.finalPrompt && !scene.loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200">
                              <Sparkle className="w-12 h-12 mb-4 opacity-30" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Chưa có prompt</span>
                            </div>
                          )}
                          {scene.loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 overflow-hidden rounded-3xl">
                              <div className="relative z-20 flex flex-col items-center w-full px-12">
                                <div className="relative mb-8">
                                  <Loader2 className="w-16 h-16 animate-spin text-orange-500 opacity-20" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-black text-orange-600">
                                      {Math.round(scene.progress || 0)}%
                                    </span>
                                  </div>
                                </div>
                                
                                <h3 className="text-xs font-black text-orange-600 uppercase tracking-[0.4em] mb-6 text-center leading-loose">
                                  NAM AI ĐANG VIẾT CÂU LỆNH<br/>
                                  <span className="text-[10px] text-slate-400">VUI LÒNG ĐỢI TRONG GIÂY LÁT...</span>
                                </h3>

                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <motion.div 
                                    className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${scene.progress || 0}%` }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                                
                                <div className="mt-4 flex justify-between w-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>KHỞI TẠO CẤU TRÚC</span>
                                  <span>HOÀN THÀNH</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {scene.finalPrompt && (
                            <div className="space-y-8">
                              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">PROMPT (ENGLISH)</span>
                                  <button 
                                    onClick={() => copyToClipboard(scene.finalPrompt!.prompt, scene.id)}
                                    className="text-emerald-400 hover:text-emerald-600 transition-colors"
                                  >
                                    {copied === scene.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <p className="text-xs font-mono font-bold text-emerald-700 leading-relaxed mb-4">
                                  {scene.finalPrompt.prompt}
                                </p>
                                <div className="h-px bg-emerald-100 mb-4" />
                                <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest block mb-2">Bản dịch Tiếng Việt</span>
                                <p className="text-xs text-slate-600 leading-relaxed italic font-bold">
                                  {scene.finalPrompt.translation}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    if (!screenplay || activeEpisodeId === null) return;
                    const updatedEpisodes = screenplay.episodes.map(ep => 
                      ep.id === activeEpisodeId ? {
                        ...ep,
                        scenes: [
                          ...ep.scenes,
                          {
                            id: "scene-" + Date.now(),
                            description: "",
                            characters: [],
                            loading: false,
                            progress: 0
                          }
                        ]
                      } : ep
                    );
                    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                  }}
                  className="w-full border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all bg-slate-50"
                >
                  <Plus className="w-10 h-10 mb-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Thêm cảnh quay mới</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: FINAL PROMPT OUTPUT */}
        {step === 4 && screenplay && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-orange-600 uppercase tracking-[0.4em]">BY NAM AI</span>
              </div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <Send className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Xuất Prompt Điện Ảnh</h2>
                    <p className="text-orange-600/60 text-[10px] font-black uppercase tracking-[0.3em]">Bước 4: Final Prompt Output</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200">
                    <ArrowLeft className="w-5 h-5 text-orange-600" />
                  </button>
                  <button onClick={reset} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-16">
                {screenplay.episodes.map((ep) => (
                   ep.scenes.some(s => s.finalPrompt) && (
                    <div key={ep.id} className="space-y-10">
                      <div className="flex items-center gap-6">
                        <div className="h-px bg-slate-200 flex-1" />
                        <h3 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.4em]">Tập {ep.id}: {ep.title}</h3>
                        <div className="h-px bg-slate-200 flex-1" />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-10">
                        {ep.scenes.map((scene, idx) => (
                          scene.finalPrompt && (
                            <div key={scene.id} className="space-y-6">
                              <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] overflow-hidden group hover:border-emerald-300 transition-all">
                                <div className="bg-emerald-100/50 px-10 py-5 flex justify-between items-center border-b border-emerald-200">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Cảnh {idx + 1} — PROMPT (ENGLISH)</span>
                                  </div>
                                  <button 
                                    onClick={() => copyToClipboard(scene.finalPrompt!.prompt, scene.id + '-final')}
                                    className="text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                  >
                                    {copied === scene.id + '-final' ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>ĐÃ SAO CHÉP</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>SAO CHÉP PROMPT</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                  <div>
                                    <label className="block text-xs font-bold text-emerald-600/60 uppercase tracking-widest mb-4">English Prompt</label>
                                    <pre className="whitespace-pre-wrap font-mono text-xs font-bold text-emerald-700 leading-relaxed bg-white/50 p-8 rounded-[1.5rem] border border-emerald-200 h-[220px] overflow-y-auto custom-scrollbar">
                                      {scene.finalPrompt.prompt}
                                    </pre>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-emerald-600/60 uppercase tracking-widest mb-4">Bản dịch Tiếng Việt</label>
                                    <div className="text-sm text-slate-600 leading-relaxed bg-white/50 p-8 rounded-[1.5rem] border border-emerald-200 h-[220px] overflow-y-auto custom-scrollbar font-bold italic">
                                      {scene.finalPrompt.translation}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JimengAI;

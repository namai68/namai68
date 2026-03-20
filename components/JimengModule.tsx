import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Clapperboard, 
  Film, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  Save, 
  Download, 
  User, 
  Settings, 
  Zap, 
  MessageSquare,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Layout,
  Camera,
  Users
} from 'lucide-react';
import { 
  suggestIdeas, 
  generateScreenplay, 
  breakdownScenes, 
  generateFinalPrompt,
  generateCharacterImage
} from '../services/jimengService';
import { 
  IdeaSuggestion, 
  Screenplay, 
  Episode, 
  Scene, 
  Character, 
  CinematicPrompt 
} from '../types';

interface JimengModuleProps {
  apiKey?: string;
}

export const JimengModule: React.FC<JimengModuleProps> = ({ apiKey }) => {
  const [step, setStep] = useState<'idea' | 'screenplay' | 'scenes'>('idea');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<IdeaSuggestion[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<string>('');
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([
    { name: 'LÊ TUẤN', role: 'Main Hero', description: 'Strong, determined look, short black hair, wearing tactical gear', image: null, isMain: true, useCameoOutfit: false },
    { name: 'NGÂN THƠM', role: 'Wife of LÊ TUẤN', description: 'Elegant, supportive, long brown hair, wearing a white dress', image: null, isMain: true, useCameoOutfit: false }
  ]);
  const [intensity, setIntensity] = useState<'storytelling' | 'action-drama' | 'hardcore'>('action-drama');
  const [copied, setCopied] = useState<string | null>(null);

  const handleSuggestIdeas = async () => {
    setLoading(true);
    try {
      const suggested = await suggestIdeas(apiKey);
      setIdeas(suggested);
    } catch (error) {
      alert("Lỗi khi gợi ý ý tưởng.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScreenplay = async (idea: string) => {
    setLoading(true);
    try {
      const data = await generateScreenplay(idea, 3, 12, apiKey);
      setScreenplay(data);
      setStep('screenplay');
    } catch (error) {
      alert("Lỗi khi tạo kịch bản.");
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdownScenes = async (episode: Episode) => {
    setLoading(true);
    try {
      const previousContext = ""; // Could be from previous episode
      const scenes = await breakdownScenes(episode.summary, 5, previousContext, intensity, apiKey);
      
      if (screenplay) {
        const updatedEpisodes = screenplay.episodes.map(ep => 
          ep.id === episode.id ? { ...ep, scenes } : ep
        );
        setScreenplay({ ...screenplay, episodes: updatedEpisodes });
      }
      setActiveEpisodeId(episode.id);
      setStep('scenes');
    } catch (error) {
      alert("Lỗi khi chia cảnh.");
    } finally {
      setLoading(false);
    }
  };

  const updateSceneDescription = (episodeId: number, sceneId: string, newDescription: string) => {
    if (screenplay) {
      const updatedEpisodes = screenplay.episodes.map(ep => {
        if (ep.id === episodeId) {
          return {
            ...ep,
            scenes: ep.scenes.map(s => s.id === sceneId ? { ...s, description: newDescription } : s)
          };
        }
        return ep;
      });
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
    }
  };

  const handleGenerateCharacterImage = async (index: number) => {
    const char = characters[index];
    try {
      const updatedChars = [...characters];
      updatedChars[index] = { ...char, loading: true };
      setCharacters(updatedChars);

      const imageUrl = await generateCharacterImage(char);
      
      const finalChars = [...characters];
      finalChars[index] = { ...char, image: imageUrl, loading: false };
      setCharacters(finalChars);
    } catch (error) {
      console.error('Error generating character image:', error);
      const resetChars = [...characters];
      resetChars[index] = { ...char, loading: false };
      setCharacters(resetChars);
    }
  };

  const handleGeneratePrompt = async (scene: Scene, episode: Episode) => {
    if (scene.loading) return;

    // Mark scene as loading
    if (screenplay) {
      const updatedEpisodes = screenplay.episodes.map(ep => {
        if (ep.id === episode.id) {
          return {
            ...ep,
            scenes: ep.scenes.map(s => s.id === scene.id ? { ...s, loading: true } : s)
          };
        }
        return ep;
      });
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
    }

    try {
      const activeEpisodeIndex = screenplay?.episodes.findIndex(ep => ep.id === episode.id) ?? -1;
      const sceneIndex = episode.scenes.findIndex(s => s.id === scene.id);
      
      const previousScene = sceneIndex > 0 ? episode.scenes[sceneIndex - 1] : null;
      
      const result = await generateFinalPrompt(
        scene.description,
        screenplay?.overallPlot ?? "",
        characters,
        intensity,
        previousScene?.description,
        previousScene?.finalPrompt?.prompt,
        false,
        apiKey
      );

      if (screenplay) {
        const updatedEpisodes = screenplay.episodes.map(ep => {
          if (ep.id === episode.id) {
            return {
              ...ep,
              scenes: ep.scenes.map(s => s.id === scene.id ? { ...s, finalPrompt: result, loading: false } : s)
            };
          }
          return ep;
        });
        setScreenplay({ ...screenplay, episodes: updatedEpisodes });
      }
    } catch (error) {
      alert("Lỗi khi tạo prompt.");
      if (screenplay) {
        const updatedEpisodes = screenplay.episodes.map(ep => {
          if (ep.id === episode.id) {
            return {
              ...ep,
              scenes: ep.scenes.map(s => s.id === scene.id ? { ...s, loading: false } : s)
            };
          }
          return ep;
        });
        setScreenplay({ ...screenplay, episodes: updatedEpisodes });
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const addCharacter = () => {
    setCharacters([...characters, { name: '', role: '', description: '', image: null, isMain: false, useCameoOutfit: false }]);
  };

  const updateCharacter = (index: number, field: keyof Character, value: any) => {
    const newChars = [...characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setCharacters(newChars);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="text-orange-600" />
          AI Jimeng - Điện ảnh chuyên nghiệp
        </h2>
        {step !== 'idea' && (
          <button 
            onClick={() => setStep(step === 'scenes' ? 'screenplay' : 'idea')}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-orange-600"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 'idea' && (
          <motion.div 
            key="step-idea"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="text-amber-500" />
                Bắt đầu với ý tưởng
              </h3>
              <div className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={selectedIdea}
                  onChange={(e) => setSelectedIdea(e.target.value)}
                  placeholder="Nhập ý tưởng của bạn hoặc nhấn gợi ý..."
                  className="flex-grow p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <button 
                  onClick={handleSuggestIdeas}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  Gợi ý
                </button>
              </div>

              {ideas.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {ideas.map((idea, i) => (
                    <button 
                      key={i}
                      onClick={() => setSelectedIdea(idea.title + ": " + idea.description)}
                      className={`p-4 text-left border rounded-xl transition-all ${selectedIdea.includes(idea.title) ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-orange-200'}`}
                    >
                      <h4 className="font-bold text-orange-700">{idea.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2">{idea.description}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => handleGenerateScreenplay(selectedIdea)}
                  disabled={loading || !selectedIdea}
                  className="px-12 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {loading ? "Đang tạo kịch bản..." : "Tạo kịch bản tổng thể"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'screenplay' && screenplay && (
          <motion.div 
            key="step-screenplay"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold mb-2 text-orange-600">Cốt truyện tổng thể</h3>
              <p className="text-slate-700 leading-relaxed mb-8">{screenplay.overallPlot}</p>

              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Film className="text-slate-400" />
                Danh sách tập phim
              </h3>
              <div className="space-y-4">
                {screenplay.episodes.map((ep) => (
                  <div key={ep.id} className="p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">Tập {ep.id}: {ep.title}</h4>
                      <button 
                        onClick={() => handleBreakdownScenes(ep)}
                        className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                      >
                        Chi tiết cảnh <ChevronRight size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600">{ep.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'scenes' && screenplay && activeEpisodeId !== null && (
          <motion.div 
            key="step-scenes"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Project Summary */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-orange-400 mb-4">
                  <Layout size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Project Overview</span>
                </div>
                <h2 className="text-3xl font-black mb-4 leading-tight">{screenplay.overallPlot.split('.')[0]}.</h2>
                <div className="flex flex-wrap gap-4">
                  <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <Film size={14} className="text-orange-400" />
                    <span className="text-xs font-bold">{screenplay.episodes.length} Tập</span>
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <Users size={14} className="text-orange-400" />
                    <span className="text-xs font-bold">{characters.length} Nhân vật</span>
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <Zap size={14} className="text-orange-400" />
                    <span className="text-xs font-bold capitalize">{intensity.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Intensity Selector */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Cấp độ nhịp phim:</span>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['storytelling', 'action-drama', 'hardcore'] as const).map((level) => (
                    <button 
                      key={level}
                      onClick={() => setIntensity(level)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${intensity === level ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      {level === 'storytelling' ? 'Storytelling' : level === 'action-drama' ? 'Action-Drama' : 'Hardcore'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Character Management */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Dàn diễn viên (Characters)</h3>
                    <p className="text-xs text-slate-500">Thiết lập ngoại hình và vai trò nhân vật</p>
                  </div>
                </div>
                <button 
                  onClick={addCharacter}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Thêm nhân vật
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {characters.map((char, index) => (
                  <div key={index} className="group relative bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-orange-200 transition-all">
                    <button 
                      onClick={() => removeCharacter(index)}
                      className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <div className="relative w-24 h-24 rounded-2xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                          {char.image ? (
                            <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <User size={32} />
                            </div>
                          )}
                          <button 
                            onClick={() => handleGenerateCharacterImage(index)}
                            disabled={char.loading}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          >
                            {char.loading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex-grow space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            placeholder="TÊN VIẾT HOA"
                            value={char.name}
                            onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                          <input 
                            placeholder="Vai trò"
                            value={char.role}
                            onChange={(e) => updateCharacter(index, 'role', e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                    <textarea 
                      placeholder="Mô tả ngoại hình chi tiết..."
                      value={char.description}
                      onChange={(e) => updateCharacter(index, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs min-h-[60px] focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={char.isMain}
                              onChange={(e) => updateCharacter(index, 'isMain', e.target.checked)}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Nhân vật chính</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={char.useCameoOutfit}
                              onChange={(e) => updateCharacter(index, 'useCameoOutfit', e.target.checked)}
                              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Dùng Cameo Outfit</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenes List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Film className="text-orange-600" />
                  Danh sách phân cảnh (12s/cảnh)
                </h3>
                <div className="flex gap-2">
                   <button 
                    onClick={() => {
                      const ep = screenplay.episodes.find(e => e.id === activeEpisodeId);
                      if (ep) handleBreakdownScenes(ep);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                   >
                     <RotateCcw size={14} /> Chia lại cảnh
                   </button>
                </div>
              </div>

              {screenplay.episodes.find(ep => ep.id === activeEpisodeId)?.scenes.map((scene, idx) => (
                <div key={scene.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center font-bold text-white shadow-inner">
                          {idx + 1}
                        </div>
                        <div className="mt-4 flex flex-col items-center gap-3">
                           <div className="w-px h-full bg-slate-100 min-h-[40px]"></div>
                        </div>
                      </div>
                      
                      <div className="flex-grow space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-grow">
                            {editingSceneId === scene.id ? (
                              <textarea 
                                autoFocus
                                value={scene.description}
                                onChange={(e) => updateSceneDescription(activeEpisodeId!, scene.id, e.target.value)}
                                onBlur={() => setEditingSceneId(null)}
                                className="w-full p-3 border border-orange-300 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px]"
                              />
                            ) : (
                              <div 
                                onClick={() => setEditingSceneId(scene.id)}
                                className="p-3 hover:bg-slate-50 rounded-xl cursor-text transition-colors group/desc"
                              >
                                <p className="text-slate-700 text-sm leading-relaxed">{scene.description}</p>
                                <span className="text-[10px] text-orange-400 opacity-0 group-hover/desc:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                                  <Settings size={10} /> Nhấn để chỉnh sửa nội dung cảnh
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleGeneratePrompt(scene, screenplay.episodes.find(ep => ep.id === activeEpisodeId)!)}
                            disabled={scene.loading}
                            className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${scene.finalPrompt ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md'}`}
                          >
                            {scene.loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                            {scene.finalPrompt ? 'Tạo lại Prompt' : 'Tạo Prompt'}
                          </button>
                        </div>

                        {scene.finalPrompt && (
                          <div className="grid md:grid-cols-2 gap-4 animate-fadeIn">
                            <div className="p-5 bg-slate-900 rounded-2xl relative group border border-slate-800">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technical Prompt</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(scene.finalPrompt!.prompt, scene.id + '-en')}
                                  className="p-1.5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                >
                                  {copied === scene.id + '-en' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                </button>
                              </div>
                              <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                                <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">{scene.finalPrompt.prompt}</p>
                              </div>
                            </div>

                            <div className="p-5 bg-orange-50 rounded-2xl relative group border border-orange-100">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Bản dịch Tiếng Việt</span>
                                </div>
                                <button 
                                  onClick={() => copyToClipboard(scene.finalPrompt!.translation, scene.id + '-vi')}
                                  className="p-1.5 bg-orange-100 text-orange-400 hover:text-orange-600 hover:bg-orange-200 rounded-lg transition-all"
                                >
                                  {copied === scene.id + '-vi' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                </button>
                              </div>
                              <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{scene.finalPrompt.translation}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

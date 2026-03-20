export interface Character {
  id?: string;
  name: string;
  role: string;
  description?: string; // Detailed visual description
  image?: string | null; // Base64 string for preview
  gender?: 'male' | 'female';
  color?: string;
  voiceGender?: string;
  voiceAge?: string;
  voiceRegion?: string;
  voiceType?: string; // New field for delivery style (e.g., Advertising, Storytelling)
  useCameoOutfit?: boolean; // For Jimeng module
  isMain?: boolean; // For Jimeng module
  loading?: boolean; // For Jimeng module
}

export interface CinematicPrompt {
  prompt: string;
  translation: string;
  chinesePrompt?: string;
}

export interface Scene {
  id: string;
  description: string;
  characters: Character[];
  loading?: boolean;
  progress?: number;
  finalPrompt?: CinematicPrompt;
}

export interface Episode {
  id: number;
  title: string;
  summary: string;
  duration: number;
  scenes: Scene[];
}

export interface Screenplay {
  overallPlot: string;
  episodes: Episode[];
  intensityLevel?: 'storytelling' | 'action-drama' | 'hardcore';
}

export interface IdeaSuggestion {
  title: string;
  description: string;
}

export interface ScriptLine {
  character: string;
  dialogue: string;
  action: string;
}

export interface VeoPrompt {
  type: string;
  prompt: string;
  dialogue_segment: string; // The specific 8s dialogue for this shot
}

export interface SoundDesign {
  music: string;
  sfx: string;
}

export interface GeneratedData {
  title: string;
  synopsis: string;
  script: ScriptLine[];
  veo_prompts: VeoPrompt[];
  sound_design: SoundDesign;
}

export interface Theme {
  id: string;
  label: string;
  icon: string;
}

export interface StyleOption {
  id: string;
  label: string;
  desc: string;
  color: string;
}

export interface ScriptTone {
  id: string;
  label: string;
  desc: string;
  instruction: string; // Instruction for the AI
}

export interface ImageAsset {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export type InteractionMode = 'wear' | 'hold';

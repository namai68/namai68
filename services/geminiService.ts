import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, GeneratedData, ScriptTone, ImageAsset, InteractionMode } from "../types";

const getAI = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey: key });
};

export const optimizeTTSPrompt = async (
  text: string, 
  voiceName: string, 
  voiceDesc: string, 
  styleInstruction: string,
  speed: number,
  apiKey?: string
): Promise<string> => {
  const ai = getAI(apiKey);
  const prompt = `
    Bạn là một chuyên gia đạo diễn âm thanh và kỹ thuật viên TTS (Text-to-Speech).
    Nhiệm vụ của bạn là tối ưu hóa "Style Instruction" cho mô hình Gemini TTS để đọc đoạn văn bản sau một cách tự nhiên và biểu cảm nhất.

    Văn bản cần đọc: "${text}"
    Tên giọng đọc: "${voiceName}"
    Mô tả giọng: "${voiceDesc}"
    Hướng dẫn phong cách hiện tại: "${styleInstruction}"
    Tốc độ yêu cầu: ${speed}x

    Yêu cầu:
    - Phân tích nội dung văn bản để xác định cảm xúc (vui, buồn, kịch tính, trang trọng...).
    - Tạo một câu hướng dẫn phong cách (Style Instruction) bằng tiếng Việt cực kỳ chi tiết, bao gồm: cách ngắt nghỉ, tông giọng, cảm xúc chủ đạo, và các lưu ý về nhấn nhá.
    - Hướng dẫn phải giúp AI hiểu được ngữ cảnh của đoạn văn.
    - Chỉ trả về duy nhất câu hướng dẫn đó, không thêm bất kỳ lời giải thích nào khác.
    - Ví dụ output: "Đọc với giọng hào hứng, tốc độ nhanh ở đầu câu và chậm lại ở cuối câu để tạo sự bất ngờ, nhấn mạnh vào các tính từ..."
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || styleInstruction;
  } catch (error) {
    console.error("Error optimizing TTS prompt:", error);
    return styleInstruction;
  }
};

export const generateSpeech = async ({ text, voiceId, speed = 1.0, apiKey }: { text: string, voiceId: string, speed?: number, apiKey?: string }): Promise<string> => {
  const ai = getAI(apiKey);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceId as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Audio) throw new Error("Không nhận được dữ liệu âm thanh từ AI.");
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

export const generateVirtualTryOn = async (
  modelImage: ImageAsset,
  description: string,
  lighting: string,
  filter: string,
  beautyOptions: string[],
  productImage?: ImageAsset,
  interactionMode: InteractionMode = 'wear',
  customBackground: string = '',
  extraOutfit?: ImageAsset,
  customPose: string = '',
  variationIndex: number = 0,
  backgroundImage?: ImageAsset,
  apiKey?: string
): Promise<string | null> => {
  const ai = getAI(apiKey);
  const parts: any[] = [];
  
  // Add model image
  parts.push({
    inlineData: {
      mimeType: modelImage.mimeType,
      data: modelImage.base64
    }
  });

  // Add product image
  if (productImage) {
    parts.push({
      inlineData: {
        mimeType: productImage.mimeType,
        data: productImage.base64
      }
    });
  }

  // Add extra outfit if holding
  if (interactionMode === 'hold' && extraOutfit) {
    parts.push({
      inlineData: {
        mimeType: extraOutfit.mimeType,
        data: extraOutfit.base64
      }
    });
  }

  // Add background image if provided
  if (backgroundImage) {
    parts.push({
      inlineData: {
        mimeType: backgroundImage.mimeType,
        data: backgroundImage.base64
      }
    });
  }

  const prompt = `
    Bạn là một chuyên gia chỉnh sửa ảnh thời trang AI cao cấp.
    Nhiệm vụ: Tạo ra một bức ảnh người mẫu đang ${interactionMode === 'wear' ? 'mặc' : 'cầm/sử dụng'} sản phẩm được cung cấp.
    
    Yêu cầu chi tiết:
    - Giữ nguyên khuôn mặt và vóc dáng của người mẫu từ ảnh tham khảo.
    - ${interactionMode === 'wear' 
        ? 'Người mẫu phải mặc bộ trang phục được cung cấp một cách tự nhiên, vừa vặn.' 
        : 'Người mẫu phải cầm/sử dụng sản phẩm được cung cấp một cách chuyên nghiệp.'}
    - Tư thế: ${customPose || 'Tự nhiên, chuyên nghiệp như chụp ảnh lookbook'}
    - Bối cảnh: ${backgroundImage ? 'Sử dụng bối cảnh từ hình ảnh bối cảnh được cung cấp.' : (customBackground || 'Studio tối giản, sang trọng')}
    - Ánh sáng: ${lighting}
    - Bộ lọc màu: ${filter}
    - Hiệu ứng làm đẹp: ${beautyOptions.join(', ')}
    - Biến thể: Đây là phiên bản số ${variationIndex + 1}. Hãy tạo ra sự khác biệt nhẹ về góc chụp hoặc biểu cảm để người dùng có nhiều lựa chọn.
    
    Chất lượng: Photorealistic, 8k, cực kỳ chi tiết, không có lỗi về giải phẫu người (ngón tay, khớp xương).
    TUYỆT ĐỐI KHÔNG CÓ CHỮ, LOGO LẠ, HOẶC CÁC CHI TIẾT THỪA.
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    const base64 = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (error) {
    console.error("Error generating virtual try-on:", error);
    return null;
  }
};

export const isolateClothingItem = async (image: ImageAsset, apiKey?: string): Promise<string | null> => {
  const ai = getAI(apiKey);
  const prompt = "Hãy tách vật thể chính (quần áo, phụ kiện) ra khỏi nền. Trả về hình ảnh vật thể đó trên nền trắng tinh khiết hoặc nền trong suốt (nếu có thể). Chỉ trả về hình ảnh, không có chữ.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          { text: prompt }
        ]
      }
    });

    const base64 = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (error) {
    console.error("Error isolating clothing item:", error);
    return null;
  }
};

export const generateSpeechStream = async ({ text, voiceId, apiKey }: { text: string, voiceId: string, apiKey?: string }) => {
  const ai = getAI(apiKey);
  return ai.models.generateContentStream({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceId as any },
        },
      },
    },
  });
};

export const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    try {
      // Try standard decoding first (in case it's a WAV or other format)
      return await ctx.decodeAudioData(bytes.buffer.slice(0));
    } catch (e) {
      console.warn("Standard decodeAudioData failed, attempting raw PCM decoding as fallback.");
      
      // Fallback for raw PCM (16-bit, mono, 24kHz) which is the default for Gemini 2.5 TTS
      const sampleRate = 24000;
      const numSamples = Math.floor(bytes.length / 2);
      const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer);
      
      for (let i = 0; i < numSamples; i++) {
        // 16-bit signed PCM is from -32768 to 32767
        // Use little-endian as it's standard for PCM
        const sample = dataView.getInt16(i * 2, true);
        // Convert to float from -1.0 to 1.0
        channelData[i] = sample / 32768;
      }
      return audioBuffer;
    }
  } catch (error) {
    console.error("Error in decodeAudioData:", error);
    throw new Error("Unable to decode audio data: " + (error instanceof Error ? error.message : String(error)));
  }
};

export const renderBufferAtSpeed = async (buffer: AudioBuffer, speed: number): Promise<AudioBuffer> => {
  if (speed === 1.0) return buffer;
  
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length / speed,
    buffer.sampleRate
  );
  
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = speed;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  return await offlineCtx.startRendering();
};

export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buffer_out = new ArrayBuffer(length);
  const view = new DataView(buffer_out);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return new Blob([buffer_out], { type: "audio/wav" });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

export const suggestTopic = async (parentTheme: string, characters: Character[], apiKey?: string): Promise<string> => {
  const ai = getAI(apiKey);
  const isGeneric = parentTheme.toLowerCase().includes("tùy chọn") || parentTheme.toLowerCase().includes("custom");
  
  const context = isGeneric 
    ? "bất kỳ chủ đề nào đang cực kỳ thịnh hành (Trending/Hot Trend) trên TikTok/Shorts hiện nay" 
    : `lĩnh vực chủ đề: "${parentTheme}"`;

  const charInfo = characters
    .filter(c => c.name.trim() !== '')
    .map((c, i) => `${i + 1}. ${c.name} (${c.role}) - ${c.description || 'Chưa có mô tả'}`)
    .join('\n    ');

  const promptText = `
    Bạn là một chuyên gia sáng tạo nội dung Viral Video (TikTok/Shorts).
    
    Thông tin các nhân vật tham gia:
    ${charInfo}
    
    Nhiệm vụ: Dựa vào đặc điểm cụ thể của các nhân vật trên và hình ảnh (nếu có), hãy gợi ý MỘT (01) chủ đề con cụ thể, giật gân, thú vị thuộc ${context}.
    
    Yêu cầu:
    - Nội dung phải được cá nhân hóa, phù hợp với tính cách/ngoại hình nhân vật.
    - Phải ngắn gọn (dưới 15 từ) bằng TIẾNG VIỆT.
    - Phải có tính "Clickbait" văn minh, gây tò mò hoặc đánh trúng tâm lý người xem.
    - KHÔNG sử dụng dấu ngoặc kép.
    - Chỉ trả về duy nhất nội dung text của chủ đề đó, không viết lời dẫn.
  `;

  const parts: any[] = [];

  characters.forEach(char => {
    if (char.image && char.image.startsWith('data:image')) {
      const matches = char.image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }
  });

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error suggesting topic:", error);
    return "Sự thật thú vị bạn chưa biết";
  }
};

export const generateScriptAndPrompts = async (
  characters: Character[],
  themeLabel: string,
  styleId: string,
  scriptTone: ScriptTone,
  customScript: string = "",
  duration: string = "30 giây",
  dialogueMode: string = 'both',
  pronounPreference: string = "",
  generalContext: string = "",
  characterStyles: Record<string, string> = {},
  apiKey?: string
): Promise<GeneratedData> => {
  const ai = getAI(apiKey);
  const activeChars = characters.filter(c => c.name.trim() !== '');
  
  let styleDescription = "";
  let promptPrefix = "";
  let characterDirectives = "";

  const getStyleTerm = (s: string) => s === 'realistic' ? "Photorealistic 4k" : "High-end 3D Pixar Animation 4k";

  if (styleId === 'mixed') {
     styleDescription = "MIXED VISUAL STYLE: Each character has a specific individual style.";
     promptPrefix = "Cinematic 4k video, Mixed Media Style, UHD";
     characterDirectives = activeChars.map(c => {
        const s = characterStyles[c.name] || '3d_animation';
        return `- Describe ${c.name} as: [${getStyleTerm(s)} style, gender: ${c.voiceGender}, age: ${c.voiceAge}, visual: ${c.description}]. ALWAYS wear this exact outfit.`;
     }).join('\n');
  } else {
     styleDescription = styleId === "realistic"
      ? "Cinematic Realistic, 4k, UHD, highly detailed, natural lighting, photorealistic textures"
      : "High-end 3D Animation, Pixar style, Disney style, 4k render, cute but detailed";
     
     promptPrefix = styleId === "realistic" ? "Cinematic 4k video, Photorealistic, UHD" : "Cinematic 4k video, 3D Animation, Pixar Style, UHD, Masterpiece";
     characterDirectives = activeChars.map(c => 
        `- Describe ${c.name} as: [gender: ${c.voiceGender}, age: ${c.voiceAge}, visual: ${c.description}]. ALWAYS wear this exact outfit.`
     ).join('\n');
  }

  const charDetails = activeChars.map((c, i) => 
    `- Nhân vật ${String.fromCharCode(65 + i)}: "${c.name}", vai trò: "${c.role}", KIỂU GIỌNG: "${c.voiceType}", VÙNG MIỀN: "${c.voiceRegion}", GIỚI TÍNH: "${c.voiceGender}", ĐỘ TUỔI: "${c.voiceAge}", MÔ TẢ NGOẠI HÌNH: "${c.description}".`
  ).join('\n');

  const promptText = `
    Bạn là một đạo diễn phim AI chuyên nghiệp. Nhiệm vụ của bạn là viết kịch bản và mô tả cảnh quay cho video ngắn.

    QUY ĐỊNH NGHIÊM NGẶT VỀ THỜI LƯỢNG VÀ AN TOÀN:
    1. THỜI LƯỢNG 8S: Mỗi cảnh quay (shot) trong "veo_prompts" tương ứng với 8 giây video. Do đó, phần "dialogue_segment" PHẢI có độ dài khoảng 15-20 từ tiếng Việt. Không được quá ngắn hoặc quá dài.
    2. AN TOÀN NỘI DUNG (SAFETY): Tuyệt đối không tạo các mô tả gây hại, nhạy cảm hoặc nguy hiểm, đặc biệt là khi có nhân vật TRẺ EM. 
       - Tránh các từ ngữ như "shouting in rage", "violent", "screaming", "suffering".
       - Thay vào đó hãy dùng: "excitedly talking", "looking surprised", "gesturing warmly", "professional character design", "wholesome atmosphere".
    3. NGÔN NGỮ: "dialogue_segment" PHẢI là TIẾNG VIỆT NAM nguyên bản. Prompt mô tả hình ảnh PHẢI là TIẾNG ANH.
    4. ĐỒNG NHẤT: Nhân vật mặc đúng một bộ trang phục xuyên suốt các cảnh.
    5. QUỐC GIA/DÂN TỘC: Tuân thủ TUYỆT ĐỐI các mô tả về quốc gia, dân tộc, đặc điểm nhân chủng học có trong "MÔ TẢ NGOẠI HÌNH" của từng nhân vật để tạo ra hình ảnh và bối cảnh phù hợp văn hóa.

    Thông tin đầu vào:
    ${charDetails}
    Bối cảnh chung: ${generalContext}
    Style: "${styleDescription}"
    Tone chủ đạo: "${scriptTone.label}". Hướng dẫn: ${scriptTone.instruction}
    Thời lượng tổng: ${duration}
    ${customScript ? `Kịch bản gốc: ${customScript}` : `Chủ đề: ${themeLabel}`}
    ${pronounPreference ? `Xưng hô: ${pronounPreference}` : ""}

    Yêu cầu JSON Output:
    - "title": Tiêu đề video hấp dẫn.
    - "script": Mảng các đối tượng { character, dialogue, action } bằng TIẾNG VIỆT.
    - "veo_prompts": Mảng các cảnh quay 8 giây. 
       + "dialogue_segment": Lời thoại TIẾNG VIỆT (khoảng 20 từ).
       + "prompt": Mô tả hình ảnh TIẾNG ANH (wholesome, high quality, professional). Bao gồm câu: "The character is performing the following dialogue in Vietnamese: '[dialogue_segment]'"
    - "sound_design": Music và SFX phù hợp.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: promptText,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          synopsis: { type: Type.STRING },
          script: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                character: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                action: { type: Type.STRING },
              },
              required: ["character", "dialogue", "action"],
            },
          },
          sound_design: {
            type: Type.OBJECT,
            properties: {
              music: { type: Type.STRING },
              sfx: { type: Type.STRING },
            },
            required: ["music", "sfx"],
          },
          veo_prompts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                dialogue_segment: { type: Type.STRING },
                prompt: { type: Type.STRING },
              },
              required: ["type", "prompt", "dialogue_segment"],
            },
          },
        },
        required: ["title", "synopsis", "script", "veo_prompts", "sound_design"],
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as GeneratedData;
  }
  
  throw new Error("No response from Gemini");
};

export const generateImage = async (
  prompt: string, 
  referenceImages?: (string | null)[], 
  styleId: string = '3d_animation', 
  characterStyles: Record<string, string> = {},
  apiKey?: string
): Promise<string> => {
  const performGeneration = async (useRefs: boolean) => {
    const ai = getAI(apiKey);
    const parts: any[] = [];
    let hasValidRefs = false;
    
    if (useRefs && referenceImages && referenceImages.length > 0) {
      referenceImages.forEach(img => {
        if (img && img.startsWith('data:image')) {
           const matches = img.match(/^data:(.+);base64,(.+)$/);
           if (matches) {
             hasValidRefs = true;
             parts.push({
               inlineData: {
                 mimeType: matches[1],
                 data: matches[2]
               }
             });
           }
        }
      });
    }

    const styleKeywords = styleId === 'realistic'
        ? "Cinematic, photorealistic, 8k, wholesome professional photography, bright lighting, safe content"
        : "3D Animation, Pixar style, Disney style, bright colors, friendly and clean, wholesome environment";

    const strictNoText = " NO TEXT, NO LETTERS, NO SPEECH BUBBLES.";
    
    // Sanitize and limit prompt to avoid overwhelming or triggering filters with complex logic
    const cleanPrompt = prompt.replace(/"/g, "'").replace(/\n/g, " ").substring(0, 700);
    let promptText = `${styleKeywords}. ${cleanPrompt}. ${strictNoText} Professional high-end quality.`;

    if (useRefs && hasValidRefs) {
      promptText = `STRICT CHARACTER IDENTITY: Maintain exact facial features and clothing from reference images. ${promptText}`;
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned");
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error("No content/parts in candidate");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Image data missing in response");
  };

  try {
    return await performGeneration(true);
  } catch (error) {
    console.warn("Retrying image generation without references due to error:", error);
    return await performGeneration(false);
  }
};

export const generateCharacterImage = async (char: Character, styleId: string, apiKey?: string, scriptTone?: ScriptTone): Promise<string> => {
  const ai = getAI(apiKey);
  const styleDescription = styleId === "realistic"
      ? "Cinematic Realistic, photorealistic 8k, wholesome character portrait, professional lighting, safe and clean"
      : "High-end 3D Animation, Pixar Disney style, cute and vibrant, professional friendly character design";

  const strictNoText = " ABSOLUTELY NO TEXT, NO WORDS. CLEAR CHARACTER DESIGN ONLY.";
  
  const analysisPrompt = `
    Create a professional image generation prompt for a character design sheet.
    Character Name: ${char.name}
    Role: ${char.role}
    STRICT Gender: ${char.voiceGender}
    STRICT Age: ${char.voiceAge}
    Visual Details: ${char.description}
    Artistic Style: ${styleDescription}
    Expression/Tone: ${scriptTone ? scriptTone.label : 'Neutral'}
    
    INSTRUCTIONS:
    - The image MUST be a CHARACTER DESIGN SHEET showing the character from multiple angles (front, back, and side views).
    - STRICTLY follow the nationality, ethnicity, or country mentioned in the "Visual Details" to ensure the character's features and clothing are culturally accurate.
    - Describe the character's face, hair, and clothing in detail.
    - The expression should match the tone: ${scriptTone ? scriptTone.desc : 'Neutral'}.
    - Ensure the character looks wholesome and professional.
    - If the character is a child, ensure the description is entirely age-appropriate, safe, and professional.
    - ${strictNoText}
  `;

  try {
    const analysisResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: analysisPrompt,
    });

    let optimizedPrompt = (analysisResponse.text || `A character sheet for ${char.name}, ${char.voiceAge} year old ${char.voiceGender}, ${char.description}`) + " . " + strictNoText;

    const parts: any[] = [];
    if (char.image && char.image.startsWith('data:image')) {
       const matches = char.image.match(/^data:(.+);base64,(.+)$/);
       if (matches) {
         parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
         optimizedPrompt = `RE-DRAW THIS CHARACTER AS A CHARACTER SHEET: Maintain facial identity, gender, and age from the reference image. Show front, back, and side views. ${optimizedPrompt}`;
       }
    }
  
    parts.push({ text: optimizedPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: parts },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    if (!response.candidates || response.candidates.length === 0) throw new Error("No candidates");
    
    const candidate = response.candidates[0];
    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data in response");
  } catch (error) {
    console.error("Failed to generate character image:", error);
    throw error;
  }
};
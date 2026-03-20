import { GoogleGenAI, Type } from "@google/genai";
import { Character, Screenplay, IdeaSuggestion, Scene, CinematicPrompt } from "../types";

const getAI = (apiKey?: string) => {
  let key = apiKey || process.env.GEMINI_API_KEY || "";
  // Clean the key: remove any non-ASCII characters and trim
  key = key.replace(/[^\x00-\x7F]/g, "").trim();
  return new GoogleGenAI({ apiKey: key });
};

const RULE_19_INSTRUCTION = "Bạn là một chuyên gia viết prompt video AI cho phim điện ảnh chuyên nghiệp, tối ưu cho Jimeng và các model AI video hàng đầu.\n" +
"Nhiệm vụ của bạn là tạo ra các prompt video '10 điểm' dựa trên các quy luật thành công sau:\n\n" +
"1. QUY TẮC 3 GIÂY (3-SECOND RULE): Chia nhỏ 12 giây thành 4 phân đoạn (0-3s, 3-6s, 6-9s, 9-12s) để đảm bảo nhịp phim dồn dập và hành động rõ ràng.\n" +
"2. VÒNG LẶP HÀNH ĐỘNG - HỆ QUẢ (ACTION-IMPACT LOOP): Mỗi hành động phải đi kèm kết quả vật lý và phản ứng môi trường. Sử dụng các từ khóa: crashes into, collapses, breaks apart, sent flying backward, debris scatter.\n" +
"3. BẢO TỒN CAMEO (NẾU CÓ): Nếu nhân vật có 'useCameoOutfit: true', TUYỆT ĐỐI KHÔNG mô tả lại quần áo. Chỉ dùng từ khóa 'Cameo Outfit' để AI tự nhận diện trang phục đã train.\n" +
"4. CẤU TRÚC PROMPT 3 LỚP (3-LAYER STRUCTURE):\n" +
"   - Lớp 1: Camera & Lighting (Góc máy, ánh sáng).\n" +
"   - Lớp 2: Subject & Action (Nhân vật và hành động chi tiết theo mốc thời gian).\n" +
"   - Lớp 3: Environment & Atmosphere (Môi trường, khói bụi, hiệu ứng hình ảnh).\n\n" +
"5. NGÔN NGỮ: Prompt chính bằng TIẾNG ANH (English) để AI hiểu tốt nhất. Bản dịch và bản tiếng Trung đi kèm.";

export const suggestIdeas = async (apiKey?: string): Promise<IdeaSuggestion[]> => {
  const ai = getAI(apiKey);
  const prompt = `
    Bạn là một chuyên gia biên kịch và sáng tạo nội dung phim ngắn (TikTok/Shorts/Reels) chuyên nghiệp.
    Hãy gợi ý 5 ý tưởng phim ngắn (khoảng 1-3 phút) đang là xu hướng (trending) hiện nay, đặc biệt là thể loại hành động, kịch tính, hoặc hài hước thâm thúy.
    
    Yêu cầu:
    - Mỗi ý tưởng bao gồm tiêu đề (title) và mô tả ngắn gọn (description).
    - Ngôn ngữ: Tiếng Việt.
    - Trả về định dạng JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "description"],
          },
        },
      },
    });

    return JSON.parse(response.text) as IdeaSuggestion[];
  } catch (error) {
    console.error("Error suggesting ideas:", error);
    return [];
  }
};

export const generateScreenplay = async (
  idea: string, 
  numEpisodes: number, 
  durationPerEpisode: number,
  apiKey?: string
): Promise<Screenplay> => {
  const ai = getAI(apiKey);
  const prompt = `
    Dựa trên ý tưởng sau: "${idea}"
    Hãy viết một kịch bản phân tập cho một series phim ngắn gồm ${numEpisodes} tập. 
    Mỗi tập có thời lượng khoảng ${durationPerEpisode} phút.
    
    Yêu cầu:
    - Viết cốt truyện tổng thể (overallPlot).
    - Với mỗi tập, viết tiêu đề (title), tóm tắt nội dung (summary), và thời lượng (duration).
    - Ngôn ngữ: Tiếng Việt.
    - Trả về định dạng JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallPlot: { type: Type.STRING },
            episodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                },
                required: ["id", "title", "summary", "duration"],
              },
            },
          },
          required: ["overallPlot", "episodes"],
        },
      },
    });

    const data = JSON.parse(response.text);
    return {
      ...data,
      episodes: data.episodes.map((e: any) => ({ ...e, scenes: [] })),
      intensityLevel: 'action-drama'
    } as Screenplay;
  } catch (error) {
    console.error("Error generating screenplay:", error);
    throw error;
  }
};

export const breakdownScenes = async (
  episodeSummary: string, 
  numScenes: number, 
  previousContext: string,
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore',
  apiKey?: string
): Promise<Scene[]> => {
  const ai = getAI(apiKey);
  
  const intensityInstructions = {
    'storytelling': 'Tập trung vào biểu cảm, hội thoại và nhịp phim chậm, sâu sắc.',
    'action-drama': 'Cân bằng giữa hành động và kịch tính, nhịp phim nhanh vừa phải.',
    'hardcore': 'Hành động dồn dập, cháy nổ, va chạm mạnh, nhịp phim cực nhanh (3s rule).'
  };

  const prompt = `
    Dựa trên tóm tắt tập phim: "${episodeSummary}"
    Bối cảnh trước đó: "${previousContext}"
    Mức độ kịch tính: "${intensityLevel}" (${intensityInstructions[intensityLevel]})
    
    Hãy chia tập phim này thành ${numScenes} cảnh quay chi tiết.
    Mỗi cảnh quay cần mô tả hành động, bối cảnh, và các nhân vật xuất hiện.
    
    Yêu cầu:
    - Mỗi cảnh quay có một ID duy nhất (string) và mô tả (description).
    - Ngôn ngữ: Tiếng Việt.
    - Trả về định dạng JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["id", "description"],
          },
        },
      },
    });

    return JSON.parse(response.text) as Scene[];
  } catch (error) {
    console.error("Error breaking down scenes:", error);
    return [];
  }
};

export const generateFinalPrompt = async (
  sceneDescription: string,
  context: string,
  characters: Character[],
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore',
  previousSceneDescription?: string,
  previousTechnicalPrompt?: string,
  isLateScene?: boolean,
  apiKey?: string
): Promise<CinematicPrompt> => {
  const ai = getAI(apiKey);
  
  // Lọc nhân vật xuất hiện trong cảnh này dựa trên mô tả cảnh
  const relevantCharacters = characters.filter(c => 
    sceneDescription.toLowerCase().includes(c.name.toLowerCase()) || 
    (c.isMain && sceneDescription.length > 0)
  );

  const charInstructions = relevantCharacters.map(c => {
    if (c.useCameoOutfit) {
      return `- ${c.name}: Wearing 'Cameo Outfit'. DO NOT describe clothes. Focus on face and action.`;
    }
    return `- ${c.name}: ${c.description || 'Standard appearance'}.`;
  }).join('\n');

  const prompt = `
    HÃY TẠO PROMPT VIDEO AI ĐỈNH CAO CHO CẢNH QUAY SAU:
    
    MÔ TẢ CẢNH: "${sceneDescription}"
    BỐI CẢNH TRUYỆN: "${context}"
    NHÂN VẬT TRONG CẢNH:
    ${charInstructions}
    
    MỨC ĐỘ KỊCH TÍNH: "${intensityLevel}"
    ${previousSceneDescription ? `CẢNH TRƯỚC: "${previousSceneDescription}"` : ""}
    ${previousTechnicalPrompt ? `PROMPT KỸ THUẬT CẢNH TRƯỚC: "${previousTechnicalPrompt}"` : ""}
    ${isLateScene ? "LƯU Ý: Đây là cảnh cao trào cuối tập." : ""}

    YÊU CẦU CẤU TRÚC PROMPT (TIẾNG ANH):
    1. Layer 1 (Camera): Cinematic angles, lens (35mm/50mm), lighting (volumetric, rim light).
    2. Layer 2 (Action): Detailed movements broken into 0-3s, 3-6s, 6-9s, 9-12s. Use Action-Impact loops.
    3. Layer 3 (Environment): Particles, debris, weather, specific atmosphere.

    YÊU CẦU ĐẦU RA (JSON):
    - prompt: English prompt (Layer 1 + Layer 2 + Layer 3).
    - translation: Vietnamese translation.
    - chinesePrompt: Chinese prompt for Jimeng AI.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: RULE_19_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            translation: { type: Type.STRING },
            chinesePrompt: { type: Type.STRING },
          },
          required: ["prompt", "translation", "chinesePrompt"],
        },
      },
    });

    return JSON.parse(response.text) as CinematicPrompt;
  } catch (error) {
    console.error("Error generating final prompt:", error);
    throw error;
  }
};


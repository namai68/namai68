import { GoogleGenAI, Type } from "@google/genai";
import { getAiClient } from "./keyService";
import { CinematicPrompt, Screenplay, IdeaSuggestion, Episode, Scene, Character } from "../types";

const RULE_19_INSTRUCTION = "Bạn là một chuyên gia viết prompt video AI cho phim điện ảnh chuyên nghiệp, tối ưu cho Jimeng và các model AI video hàng đầu.\n" +
"Nhiệm vụ của bạn là tạo ra các prompt video '10 điểm' dựa trên các quy luật thành công sau:\n\n" +
"1. QUY TẮC 3 GIÂY (3-SECOND RULE): Chia nhỏ 12 giây thành 4 phân đoạn (0-3s, 3-6s, 6-9s, 9-12s) để đảm bảo nhịp phim dồn dập và hành động rõ ràng.\n" +
"2. VÒNG LẶP HÀNH ĐỘNG - HỆ QUẢ (ACTION-IMPACT LOOP): Mỗi hành động phải đi kèm kết quả vật lý và phản ứng môi trường. Sử dụng các từ khóa: crashes into, collapses, breaks apart, sent flying backward, debris scatter.\n" +
"3. BẢO TỒN CAMEO (NẾU CÓ YÊU CẦU): Nếu prompt có yêu cầu CAMEO, BẮT ĐẦU Action bằng câu: 'Same cameo character, same original outfit, no costume change. lower body wearing black pants and black shoes.' Khi đó, TUYỆT ĐỐI KHÔNG mô tả thêm bất kỳ chi tiết trang phục nào khác.\n" +
"4. MÔI TRƯỜNG ĐIỆN ẢNH: Ưu tiên bối cảnh Đêm (Night), Mưa (Rain/Heavy Rain) tại các địa điểm như Warehouse, Harbor, Nightclub để tối ưu ánh sáng và hiệu ứng hạt.\n" +
"5. THUẬT NGỮ VÕ THUẬT CHUẨN: Sử dụng các chiêu thức: spinning kick, flying kick, side kick, elbow strike, combat stance, tactical slide.\n" +
"6. ĐỊNH DANH NHÂN VẬT: SỬ DỤNG TÊN VIẾT HOA (Ví dụ: LÊ TUẤN, ĐÌNH THƯỢC) kèm vai trò và mối quan hệ CỤ THỂ (Ví dụ: NGÂN THƠM - Wife of LÊ TUẤN) ở lần nhắc đầu tiên.\n" +
"7. CẤU TRÚC BẮT BUỘC:\n" +
"    - Location: (Địa điểm cụ thể)\n" +
"    - Time: (Thời gian cụ thể)\n" +
"    - Style: cinematic martial arts action\n" +
"    - Action: (Mô tả theo 4 mốc thời gian 0-3s, 3-6s, 6-9s, 9-12s. Nếu có CAMEO thì bắt đầu bằng câu bảo tồn cameo).\n" +
"8. CẤM CHỈ ĐỊNH GÓC MÁY: Không dùng từ ngữ về góc máy hay kỹ thuật quay phim.\n" +
"9. DỊCH THUẬT 100% (FULL MIRROR): Bản dịch Tiếng Việt phải khớp 100% với bản Tiếng Anh.";

export const suggestIdeas = async (apiKey?: string): Promise<IdeaSuggestion[]> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: "Đề xuất 5 chủ đề phim hành động đang hot trend (Võ thuật đường phố, Trả thù, Đặc nhiệm...). Mỗi chủ đề gồm tiêu đề và mô tả ngắn." }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const generateScreenplay = async (idea: string, numEpisodes: number, durationPerEpisode: number, apiKey?: string): Promise<Screenplay> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: "Dựa trên ý tưởng: \"" + idea + "\", hãy viết kịch bản tổng thể cho bộ phim gồm " + numEpisodes + " tập. Tóm tắt nội dung chi tiết cho từng tập." }] }],
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
                summary: { type: Type.STRING }
              },
              required: ["id", "title", "summary"]
            }
          }
        },
        required: ["overallPlot", "episodes"]
      }
    }
  });
  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    episodes: data.episodes.map((ep: any) => ({ 
      ...ep, 
      duration: durationPerEpisode, 
      scenes: [] 
    }))
  };
};

export const breakdownScenes = async (episodeSummary: string, numScenes: number, previousContext: string, intensityLevel: 'storytelling' | 'action-drama' | 'hardcore', apiKey?: string): Promise<Scene[]> => {
  const ai = getAiClient(apiKey);
  
  const intensityInstructions = {
    'storytelling': "\nCẤP ĐỘ: NHỊP BÌNH THƯỜNG (STORYTELLING)\n- Phong cách: Tâm lý xã hội, có chiều sâu, ít đánh nhau.\n- Tỉ lệ cảnh hành động: ~20%.\n- Tập trung vào: Đối thoại, bối cảnh, cảm xúc nhân vật.\n- Nhịp độ: Chậm, sâu sắc.\n",
    'action-drama': "\nCẤP ĐỘ: KỊCH TÍNH VỪA PHẢI (ACTION-DRAMA)\n- Phong cách: Hành động điều tra, hình sự.\n- Tỉ lệ cảnh hành động: ~50%.\n- Tập trung vào: Rượt đuổi ngắn, xô xát, căng thẳng tăng dần.\n- Nhịp độ: Trung bình, bùng nổ cuối tập.\n",
    'hardcore': "\nCẤP ĐỘ: ĐỘC CHIẾN LIÊN HOÀN (HARDCORE ACTION)\n- Phong cách: Đánh nhau liên tục từ đầu đến cuối.\n- Tỉ lệ cảnh hành động: 90% - 100%.\n- Tập trung vào: Va chạm vật lý mạnh, chiến đấu tốc độ cao, liên hoàn đòn.\n- Nhịp độ: Cực nhanh, dồn dập.\n"
  };

  const prompt = "Dựa trên tóm tắt tập phim hiện tại: \"" + episodeSummary + "\"\n" +
    "Và bối cảnh từ tập trước (nếu có): \"" + previousContext + "\"\n\n" +
    intensityInstructions[intensityLevel] + "\n" +
    "Hãy chia thành " + numScenes + " cảnh quay chi tiết (mỗi cảnh tương ứng 12 giây).\n\n" +
    "QUY TẮC LIÊN KẾT CẢNH (CINEMATIC CONTINUITY):\n" +
    "1. Móc nối hành động (Action Bridge): Cảnh N kết thúc ở tư thế/vị trí nào, thì Cảnh N+1 phải bắt đầu bằng việc tái hiện lại tư thế đó (trong 2 giây đầu) trước khi tiếp tục hành động mới.\n" +
    "2. Chuyển đổi bối cảnh (Location Bridge): Nếu Cảnh N và Cảnh N+1 khác địa điểm, bạn BẮT BUỘC phải viết một hành động chuyển dịch vật lý (như bị đá văng qua cửa, chạy thoát ra sảnh, bước qua cổng...) để giải thích sự thay đổi bối cảnh. Tuyệt đối không để nhân vật tự nhiên xuất hiện ở bối cảnh mới.\n" +
    "3. Kế thừa môi trường (Environment Persistence): Mọi sự thay đổi về môi trường (kính vỡ, bàn ghế đổ, cửa mở) phải được ghi nhận và duy trì trong mô tả bối cảnh của tất cả các cảnh kế tiếp trong cùng một địa điểm.\n\n" +
    "YÊU CẦU QUAN TRỌNG CHO MỖI CẢNH:\n" +
    "1. GIỚI HẠN NHÂN VẬT (BẮT BUỘC): Mỗi cảnh CHỈ ĐƯỢC PHÉP có tối đa 3 nhân vật chính có tên. Tuyệt đối không được để 4 nhân vật chính xuất hiện trong cùng một mô tả cảnh. Nếu kịch bản gốc có 4 người, bạn phải chia thành 2 cảnh (ví dụ: Cảnh 1 tập trung vào A-B-C, Cảnh 2 tập trung vào B-C-D).\n" +
    "2. Phải nhắc lại đầy đủ: Địa điểm, Thời gian, Thời tiết/Ánh sáng, Trang phục nhân vật, và Bối cảnh tình huống đang diễn ra.\n" +
    "3. SỬ DỤNG ĐỊNH DANH NHÂN VẬT (Ví dụ: \"[Lê Tuấn]\", \"[Sato]\", \"[Tuyết Mai]\"). Phải để tên nhân vật trong ngoặc vuông để hệ thống nhận diện.\n" +
    "4. MỐI QUAN HỆ NHÂN VẬT: Bạn phải ghi rõ mối quan hệ ngay trong mô tả (Ví dụ: [Hà Út] - vợ của [Đình Thược], [Ngân Thơm] - vợ của [Lê Tuấn]) để tránh nhầm lẫn vai trò.\n" +
    "5. ĐẶC BIỆT: Mô tả rõ điểm kết thúc của cảnh trước để cảnh sau có thể \"móc nối\" hành động một cách mượt mà.\n";

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
            description: { type: Type.STRING }
          },
          required: ["description"]
        }
      }
    }
  });
  const scenes = JSON.parse(response.text || "[]");
  return scenes.map((s: any, index: number) => ({
    id: "scene-" + Date.now() + "-" + index,
    description: s.description,
    characters: [],
    loading: false,
    progress: 0
  }));
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
  const ai = getAiClient(apiKey);
  
  let characterInstructions = "";
  const anyCameo = characters.some(c => c.useCameoOutfit);

  if (characters && characters.length > 0) {
    const activeCharacters = characters.filter(c => 
      sceneDescription.toLowerCase().includes(c.name.toLowerCase())
    );

    if (activeCharacters.length > 0) {
      const sortedCharacters = [...activeCharacters].sort((a, b) => {
        if (a.isMain === b.isMain) return 0;
        return a.isMain ? -1 : 1;
      });

      const mainCharacters = sortedCharacters.filter(c => c.isMain);
      const supportingCharacters = sortedCharacters.filter(c => !c.isMain);
      
      const topMain = mainCharacters.slice(0, 3);
      const excludedMain = mainCharacters.slice(3);

      characterInstructions = "DANH SÁCH NHÂN VẬT VÀ QUY TẮC TRANG PHỤC (CHỈ SỬ DỤNG TỐI ĐA 3 NHÂN VẬT NÀY):\n";
      
      topMain.forEach((char) => {
        const charDesc = char.description ? ` (${char.description})` : "";
        const cameoNote = char.useCameoOutfit ? " [CHẾ ĐỘ CAMEO ĐANG BẬT - CẤM MÔ TẢ TRANG PHỤC]" : "";
        characterInstructions += "- " + char.name + charDesc + cameoNote + ": Đây là nhân vật chính. AI hãy dựa vào mô tả để xác định đúng mối quan hệ (ví dụ: vợ của ai, đối thủ của ai). " + (char.useCameoOutfit ? "LƯU Ý: Tuyệt đối KHÔNG được đưa bất kỳ chi tiết trang phục nào từ phần mô tả này vào prompt vì nhân vật đang dùng trang phục Cameo cố định." : "") + "\n";
      });

      supportingCharacters.forEach((char) => {
        const charDesc = char.description ? ` (${char.description})` : "";
        const cameoNote = char.useCameoOutfit ? " [CHẾ ĐỘ CAMEO ĐANG BẬT - CẤM MÔ TẢ TRANG PHỤC]" : "";
        characterInstructions += "- " + char.name + charDesc + cameoNote + ": Đây là nhân vật phụ. " + (char.useCameoOutfit ? "LƯU Ý: Tuyệt đối KHÔNG được đưa bất kỳ chi tiết trang phục nào từ phần mô tả này vào prompt vì nhân vật đang dùng trang phục Cameo cố định." : "") + "\n";
      });

      if (anyCameo) {
        characterInstructions += "\nQUY TẮC TRANG PHỤC CAMEO: All characters keep original cameo outfit, no changes. lower body wearing black pants and black shoes. (BẮT BUỘC nhắc câu này ở đầu phần Action vì có nhân vật sử dụng Cameo).\n";
      }

      if (excludedMain.length > 0) {
        characterInstructions += `\nLƯU Ý QUAN TRỌNG: Tuyệt đối KHÔNG đưa các nhân vật sau vào prompt này: ${excludedMain.map(c => c.name).join(', ')}. Chỉ tập trung vào 3 nhân vật chính đã liệt kê ở trên.\n`;
      }
    } else {
      characterInstructions = "Hãy tự xác định các nhân vật và trang phục phù hợp dựa trên mô tả cảnh.";
    }
  } else {
    characterInstructions = "Hãy tự xác định các nhân vật và trang phục phù hợp.";
  }

  const layer1 = "LỚP 1: BỐI CẢNH TỔNG QUAN\n" + context + "\n";
  const layer2 = "LỚP 2: DIỄN BIẾN PHÂN CẢNH\n" + sceneDescription + "\n";
  
  let layer3 = "LỚP 3: KẾ THỪA KỸ THUẬT\n";
  if (previousTechnicalPrompt) {
    layer3 += "TRUY XUẤT TỪ PROMPT TRƯỚC: \"" + previousTechnicalPrompt + "\"\n" +
              "HÃY TRÍCH XUẤT 'MÃ GEN' KỸ THUẬT (Ánh sáng, Vị trí vật lý, Tình trạng môi trường) VÀ SAO CHÉP VÀO PROMPT MỚI.\n";
  }
  if (previousSceneDescription) {
    layer3 += "MÓC NỐI HÀNH ĐỘNG: Cảnh trước kết thúc tại \"" + previousSceneDescription + "\". Đảm bảo 2 giây đầu tái hiện lại tư thế này.\n";
  }

  const promptText = "HÃY THỰC HIỆN QUY TRÌNH 3 LỚP ĐỂ TẠO PROMPT VIDEO AI ĐIỆN ẢNH TỐI GIẢN TUYỆT ĐỐI:\n\n" +
    layer1 + "\n" +
    layer2 + "\n" +
    layer3 + "\n" +
    "Cấp độ nhịp phim: " + intensityLevel.toUpperCase() + ". \n" +
    "Từ khóa phong cách bắt buộc: cinematic martial arts action.\n\n" +
    characterInstructions + "\n\n" +
    "YÊU CẦU ĐẶC BIỆT (CẤU TRÚC BẤT BIẾN):\n" +
    "1. Ngôn ngữ: TIẾNG ANH điện ảnh tối giản (Minimalist Cinematic English).\n" +
    "2. CẤU TRÚC BẮT BUỘC (KHÔNG ĐƯỢC THIẾU BẤT KỲ MỤC NÀO):\n" +
    "   - Location: (Địa điểm cụ thể)\n" +
    "   - Time: (Thời gian cụ thể)\n" +
    "   - Style: cinematic martial arts action\n" +
    "   - Action: (" + (anyCameo ? "BẮT ĐẦU bằng câu: 'Same cameo character, same original outfit, no costume change. lower body wearing black pants and black shoes.' " : "") + "Sau đó mô tả hành động theo QUY TẮC 3 GIÂY: 0-3s, 3-6s, 6-9s, 9-12s. SỬ DỤNG TÊN VIẾT HOA (Ví dụ: LÊ TUẤN, ĐÌNH THƯỢC) kèm vai trò và mối quan hệ CỤ THỂ ở lần nhắc đầu tiên. PHẢI áp dụng VÒNG LẶP HÀNH ĐỘNG-HỆ QUẢ: mô tả đòn đánh kèm kết quả vật lý (vỡ bàn, văng xa, đổ sụp). TUYỆT ĐỐI không sử dụng quá 3 nhân vật chính trong một prompt. " + (anyCameo ? "TUYỆT ĐỐI KHÔNG mô tả trang phục cho các nhân vật có đánh dấu CAMEO." : "Mô tả trang phục dựa trên danh sách nhân vật được cung cấp.") + ").\n" +
    "3. TỐI GIẢN HÀNH ĐỘNG: Tuyệt đối không mô tả tiểu tiết vật lý hay tính từ cảm xúc. Chỉ mô tả SỰ KIỆN và TÌNH HUỐNG khách quan.\n" +
    "4. CẤM CHỈ ĐỊNH GÓC MÁY: Không dùng bất kỳ từ ngữ nào về góc máy hay kỹ thuật quay phim.\n" +
    "5. DỊCH THUẬT 100% (FULL MIRROR): Bản dịch Tiếng Việt phải khớp 100% với bản Tiếng Anh về cả cấu trúc và nội dung. Dịch toàn bộ nội dung sang Tiếng Việt, bao gồm cả các tiêu đề mục (Location -> Địa điểm, Time -> Thời gian, Style -> Phong cách, Action -> Hành động) và các vai trò nhân vật (Hero -> Anh hùng, Villain -> Kẻ phản diện, Wife -> Vợ, Partner -> Bạn đồng hành...). TUYỆT ĐỐI KHÔNG giữ lại bất kỳ từ Tiếng Anh nào trong phần 'translation'.\n\n" +
    "LƯU Ý QUAN TRỌNG: TUYỆT ĐỐI KHÔNG tạo prompt tiếng Trung. Chỉ tập trung vào bản Tiếng Anh và Tiếng Việt theo cấu trúc trên.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      systemInstruction: RULE_19_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          translation: { type: Type.STRING }
        },
        required: ["prompt", "translation"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateCharacterImage = async (character: Character, apiKey?: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const prompt = `Cinematic portrait of a movie character: ${character.name}. 
    Role: ${character.role}. 
    Description: ${character.description}. 
    High quality, cinematic lighting, detailed facial features, 8k resolution, professional movie still.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error('Could not generate image');
};

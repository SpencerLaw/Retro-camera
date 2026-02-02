
import { GoogleGenAI } from "@google/genai";

// Fixed: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAiPlanningAdvice(childName: string, age: number, goals: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `作为一个育儿专家，请为名为${childName}的${age}岁孩子制定一份寒假规划建议。
      家长的期望是：${goals}。
      请提供3条核心建议，每条建议包含：1. 建议名称 2. 实施方法 3. 推荐积分奖励分值。
      请用中文回答，格式简洁。`,
      config: {
        temperature: 0.7,
      },
    });
    // Fixed: response.text is a property, not a method.
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "抱歉，AI 暂时无法提供建议，请稍后再试。";
  }
}

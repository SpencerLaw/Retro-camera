/**
 * Remixes an image using Gemini's image editing/generation capabilities.
 * @param base64Image The source image in base64 format (without data URI prefix preferably, but helper handles it)
 * @param prompt The text prompt describing the desired transformation
 * @returns The base64 data of the generated image
 */
export const remixImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/remix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, prompt })
    });

    if (!response.ok) {
      throw new Error('Failed to remix image');
    }

    const result = await response.json();
    return result.imageUrl;
  } catch (error) {
    console.error("Gemini Remix Error:", error);
    throw error;
  }
};
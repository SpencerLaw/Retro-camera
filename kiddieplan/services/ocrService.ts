import { createWorker } from 'tesseract.js';

export interface ScannedTask {
  title: string;
  points: number;
  time: string;
}

/**
 * Perform local OCR on an image and extract potential task titles
 * @param imageSource Base64 string or Blob/File
 */
export const performOCR = async (imageSource: string | File): Promise<ScannedTask[]> => {
  const worker = await createWorker('chi_sim+eng');
  
  try {
    const { data: { text } } = await worker.recognize(imageSource);
    
    // Parse the text into tasks
    // We look for lines that look like tasks
    // For now, let's just split by newlines and filter out empty or too-short lines
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2 && !isNoise(line));
    
    // Convert lines to ScannedTask objects with default values
    const tasks: ScannedTask[] = lines.map(line => ({
      title: cleanTitle(line),
      points: 20, // Default points
      time: '19:00', // Default time
    }));

    return tasks;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  } finally {
    await worker.terminate();
  }
};

/**
 * Filter out lines that are likely OCR noise (too short, symbols only, etc.)
 */
const isNoise = (text: string): boolean => {
  // If it's just symbols or numbers with no characters
  if (/^[0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(text)) return true;
  return false;
};

/**
 * Clean up the title (remove leading numbers, bullets, etc.)
 */
const cleanTitle = (text: string): string => {
  return text
    .replace(/^[0-9一二三四五六七八九十][\.、．\s]*/, '') // Remove leading numbers
    .replace(/^[\-\*•·]\s*/, '') // Remove leading bullets
    .trim();
};

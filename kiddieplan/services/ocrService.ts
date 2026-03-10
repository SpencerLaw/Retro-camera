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
  const worker = await createWorker('chi_sim+eng', 1, {
    logger: m => console.log(m),
  });
  
  try {
    // Set parameters for better list recognition
    // PSM 6: Assume a single uniform block of text.
    await worker.setParameters({
      tessedit_pageseg_mode: '6' as any,
    });

    const { data: { text } } = await worker.recognize(imageSource);
    
    // Parse the text into tasks
    // Better splitting: handle multiple delimiters common in OCR
    const lines = text.split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line.length >= 2 && !isNoise(line));
    
    // Convert lines to ScannedTask objects with default values
    const tasks: ScannedTask[] = lines.map(line => {
        const cleaned = cleanTitle(line);
        return {
            title: cleaned,
            points: estimatePoints(cleaned),
            time: '19:00',
        };
    }).filter(t => t.title.length >= 2);

    return tasks;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  } finally {
    await worker.terminate();
  }
};

/**
 * Heuristic to estimate points based on keywords
 */
const estimatePoints = (text: string): number => {
    if (text.includes('听写') || text.includes('背诵')) return 30;
    if (text.includes('阅读') || text.includes('打卡')) return 15;
    return 20;
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

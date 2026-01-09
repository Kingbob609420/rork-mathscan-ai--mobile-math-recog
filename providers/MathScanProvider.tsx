import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

type ProblemType = 'arithmetic' | 'algebra' | 'geometry' | 'other';

interface MathProblem {
  problemText: string;
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  explanation?: string;
  problemType?: ProblemType;
  steps?: string[];
  confidence?: number;
  qualityIssues?: string[];
}

interface Scan {
  id: string;
  timestamp: number;
  imageUri: string;
  problems: MathProblem[];
  imageQuality?: {
    score: number;
    issues: string[];
  };
}

interface Stats {
  totalScans: number;
  totalProblems: number;
  correctAnswers: number;
}

interface MathScanContextType {
  scans: Scan[];
  stats: Stats;
  recentScans: Scan[];
  processScan: (imageUri: string) => Promise<string>;
  getScanById: (id: string) => Scan | undefined;
  deleteScan: (id: string) => Promise<void>;
  clearAllScans: () => Promise<void>;
}

const STORAGE_KEY = "mathscan_history";
const STORAGE_BACKUP_KEY = "mathscan_history_backup";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

export const [MathScanProvider, useMathScan] = createContextHook<MathScanContextType>(() => {
  console.log("[MathScanProvider] Initializing provider...");
  console.log("[MathScanProvider] Platform:", Platform.OS);
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalScans: 0,
    totalProblems: 0,
    correctAnswers: 0,
  });
  const [, _setInitialized] = useState(false);

  const saveScans = useCallback(async (newScans: Scan[]) => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const dataToSave = JSON.stringify(newScans);
        
        if (!dataToSave || dataToSave === 'null') {
          console.error('[saveScans] Invalid data, skipping save');
          return;
        }
        
        await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
        await AsyncStorage.setItem(STORAGE_BACKUP_KEY, dataToSave);
        setScans(newScans);
        console.log('[saveScans] Successfully saved', newScans.length, 'scans');
        return;
      } catch (error) {
        retries++;
        console.error(`[saveScans] Error saving scans (attempt ${retries}/${MAX_RETRIES}):`, error);
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        } else {
          console.error('[saveScans] Failed to save after all retries');
        }
      }
    }
  }, []);

  const loadScans = useCallback(async () => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        console.log("[MathScanProvider] Loading scans (attempt", retries + 1, "/", MAX_RETRIES, ")...");
        
        if (Platform.OS === 'web') {
          let stored = await AsyncStorage.getItem(STORAGE_KEY);
          
          if (!stored) {
            console.log('[MathScanProvider] Primary storage empty, trying backup...');
            stored = await AsyncStorage.getItem(STORAGE_BACKUP_KEY);
          }
          
          if (stored && stored !== 'null' && stored !== 'undefined') {
            const parsedScans = JSON.parse(stored);
            if (Array.isArray(parsedScans)) {
              console.log("[MathScanProvider] Loaded", parsedScans.length, "scans");
              setScans(parsedScans);
            } else {
              console.error('[MathScanProvider] Invalid scan data format');
              setScans([]);
            }
          } else {
            console.log("[MathScanProvider] No scans found in storage");
            setScans([]);
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          let stored = await AsyncStorage.getItem(STORAGE_KEY);
          
          if (!stored) {
            console.log('[MathScanProvider] Primary storage empty, trying backup...');
            stored = await AsyncStorage.getItem(STORAGE_BACKUP_KEY);
          }
          
          if (stored && stored !== 'null' && stored !== 'undefined') {
            const parsedScans = JSON.parse(stored);
            if (Array.isArray(parsedScans)) {
              console.log("[MathScanProvider] Loaded", parsedScans.length, "scans");
              setScans(parsedScans);
            } else {
              console.error('[MathScanProvider] Invalid scan data format');
              setScans([]);
            }
          } else {
            console.log("[MathScanProvider] No scans found in storage");
            setScans([]);
          }
        }
        _setInitialized(true);
        return;
      } catch (error) {
        retries++;
        console.error(`[MathScanProvider] Error loading scans (attempt ${retries}/${MAX_RETRIES}):`, error);
        console.error("[MathScanProvider] Error stack:", error instanceof Error ? error.stack : 'N/A');
        
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        } else {
          console.error('[MathScanProvider] Failed to load after all retries, starting fresh');
          setScans([]);
          _setInitialized(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadScans().catch(err => {
        console.error("[MathScanProvider] Failed to load scans in useEffect:", err);
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [loadScans]);

  useEffect(() => {
    const totalScans = scans.length;
    const totalProblems = scans.reduce((acc, scan) => acc + scan.problems.length, 0);
    const correctAnswers = scans.reduce(
      (acc, scan) => acc + scan.problems.filter(p => p.isCorrect).length,
      0
    );

    setStats({ totalScans, totalProblems, correctAnswers });
  }, [scans]);

  const getScanById = useCallback((id: string): Scan | undefined => {
    return scans.find(scan => scan.id === id);
  }, [scans]);

  const deleteScan = useCallback(async (id: string) => {
    try {
      console.log('[deleteScan] Deleting scan:', id);
      const updatedScans = scans.filter(scan => scan.id !== id);
      await saveScans(updatedScans);
      console.log('[deleteScan] Successfully deleted scan');
    } catch (error) {
      console.error('[deleteScan] Error deleting scan:', error);
      throw error;
    }
  }, [scans, saveScans]);

  const clearAllScans = useCallback(async () => {
    try {
      console.log('[clearAllScans] Clearing all scans...');
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(STORAGE_BACKUP_KEY);
      setScans([]);
      console.log('[clearAllScans] Successfully cleared all scans');
    } catch (error) {
      console.error('[clearAllScans] Error clearing scans:', error);
      setScans([]);
      throw error;
    }
  }, []);


  const resizeImageForAI = useCallback(async (base64: string, maxWidth: number = 512): Promise<string> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        try {
          const img = new window.Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            const maxDim = maxWidth;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = (height * maxDim) / width;
                width = maxDim;
              } else {
                width = (width * maxDim) / height;
                height = maxDim;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(base64);
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const resized = canvas.toDataURL('image/jpeg', 0.6);
            const resizedBase64 = resized.split(',')[1];
            console.log('[resizeImageForAI] Resized from', base64.length, 'to', resizedBase64.length);
            resolve(resizedBase64);
          };
          img.onerror = () => {
            console.warn('[resizeImageForAI] Failed to resize, using original');
            resolve(base64);
          };
          img.src = `data:image/jpeg;base64,${base64}`;
        } catch (e) {
          console.warn('[resizeImageForAI] Error:', e);
          resolve(base64);
        }
      } else {
        resolve(base64);
      }
    });
  }, []);

  const convertImageToBase64 = useCallback(async (uri: string): Promise<string> => {
    console.log('[convertImageToBase64] Converting image:', uri.substring(0, 80));
    console.log('[convertImageToBase64] Platform:', Platform.OS);
    
    if (!uri || uri.trim() === '') {
      throw new Error('Empty URI provided');
    }
    
    if (uri.startsWith('data:image')) {
      console.log('[convertImageToBase64] Already base64 data URI');
      const base64 = uri.split(',')[1];
      if (base64 && base64.length > 100) return base64;
      throw new Error('Invalid data URI format');
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(uri, { 
        signal: controller.signal,
        cache: 'no-cache'
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      console.log('[convertImageToBase64] Blob size:', blob.size, 'type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('Image file is empty');
      }
      
      if (blob.size > 10 * 1024 * 1024) {
        console.warn('[convertImageToBase64] Large image, may cause issues:', blob.size);
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result) {
            reject(new Error('FileReader returned empty'));
            return;
          }
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          console.log('[convertImageToBase64] Success, base64 length:', base64.length);
          resolve(base64);
        };
        reader.onerror = (e) => {
          console.error('[convertImageToBase64] FileReader error:', e);
          reject(new Error('FileReader failed'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[convertImageToBase64] Error:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Image conversion timed out');
        }
        throw new Error(`Image conversion failed: ${error.message}`);
      }
      throw error;
    }
  }, []);

  const analyzeImageQuality = useCallback(async (_base64Image: string): Promise<{ score: number; issues: string[] }> => {
    return { score: 75, issues: [] };
  }, []);

  const processScan = useCallback(async (imageUri: string): Promise<string> => {
    let attempts = 0;
    let lastError: Error | null = null;
    
    console.log('[processScan] Starting scan process...');
    
    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        console.log(`[processScan] Attempt ${attempts}/${MAX_RETRIES}`);
        
        if (!imageUri || imageUri.trim() === '') {
          throw new Error('No image URI provided');
        }
        
        console.log('[processScan] Converting image to base64...');
        const base64Image = await convertImageToBase64(imageUri);
        
        if (!base64Image || base64Image.length < 100) {
          throw new Error('Invalid base64 image data');
        }
        
        const imageQuality = await analyzeImageQuality(base64Image);
        
        console.log('[processScan] Calling Rork AI with generateObject...');
        console.log('[processScan] Image base64 size:', base64Image.length);
        
        const optimizedImage = await resizeImageForAI(base64Image);
        console.log('[processScan] Optimized image size:', optimizedImage.length);
        
        const mathProblemSchema = z.object({
          problemText: z.string().describe("The math problem text from the image"),
          userAnswer: z.string().optional().describe("The student's answer if visible"),
          correctAnswer: z.string().optional().describe("The correct answer"),
          isCorrect: z.boolean().describe("Whether the student's answer is correct"),
          explanation: z.string().optional().describe("Explanation if answer is wrong"),
          problemType: z.enum(['arithmetic', 'algebra', 'geometry', 'other']).optional().describe("Type of math problem"),
          steps: z.array(z.string()).optional().describe("Solution steps"),
          confidence: z.number().optional().describe("Confidence score 0-100"),
          qualityIssues: z.array(z.string()).optional().describe("Image quality issues")
        });
        
        const responseSchema = z.object({
          problems: z.array(mathProblemSchema)
        });
        
        const prompt = `You are a math problem analyzer. Analyze this image and identify all math problems.

For each problem:
1. Extract the problem text
2. Identify problem type: 'arithmetic', 'algebra', 'geometry', or 'other'
3. Find the student's answer if present
4. Calculate the correct answer
5. Determine if student is correct (be lenient with formatting: "4" = "4.0", "x=4" = "4")
6. Provide explanation if wrong

For ± answers (quadratics, square roots): Accept EITHER positive or negative as correct.

Analyze this math homework image:`;
        
        console.log('[processScan] Sending request to Rork Toolkit...');
        
        let result;
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('AI request timed out after 60s')), 60000);
          });
          
          console.log('[processScan] Calling generateObject from toolkit...');
          
          const generatePromise = generateObject({
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image", image: optimizedImage }
                ]
              }
            ],
            schema: responseSchema
          });
          
          result = await Promise.race([generatePromise, timeoutPromise]);
          console.log('[processScan] generateObject completed successfully');
        } catch (aiError) {
          console.error('[processScan] AI generation error:', aiError);
          const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
          console.error('[processScan] Error message:', errorMsg);
          console.error('[processScan] Error stack:', aiError instanceof Error ? aiError.stack : 'N/A');
          
          if (errorMsg.includes('timed out')) {
            throw new Error('The AI service is taking too long. Please try with a clearer image.');
          }
          
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('fetch')) {
            console.log('[processScan] Network error detected, checking connectivity...');
            throw new Error('Unable to connect to the AI service. Please check your internet connection and try again.');
          }
          
          throw new Error(`AI processing failed: ${errorMsg}`);
        }
        
        console.log('[processScan] AI response received successfully');
        console.log('[processScan] Parsed', result.problems.length, 'problems');
        
        const problems: MathProblem[] = result.problems.map(p => ({
          problemText: p.problemText,
          userAnswer: p.userAnswer,
          correctAnswer: p.correctAnswer,
          isCorrect: p.isCorrect,
          explanation: p.explanation,
          problemType: p.problemType,
          steps: p.steps || [],
          confidence: p.confidence,
          qualityIssues: p.qualityIssues || []
        }));

        const scanId = Date.now().toString();
        const newScan: Scan = {
          id: scanId,
          timestamp: Date.now(),
          imageUri,
          problems,
          imageQuality,
        };

        await saveScans([newScan, ...scans]);
        console.log('[processScan] Complete! ID:', scanId);
        return scanId;
        
      } catch (error) {
        console.error(`[processScan] Error attempt ${attempts}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempts < MAX_RETRIES) {
          const delay = RETRY_DELAY * attempts;
          console.log(`[processScan] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('[processScan] All attempts failed');
    const errorMessage = lastError?.message || 'Unknown error';
    
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the AI service. Please check your internet connection and try again.');
    }
    
    throw new Error(`Failed to process image: ${errorMessage}`);
  }, [scans, saveScans, convertImageToBase64, analyzeImageQuality, resizeImageForAI]);

  const recentScans = useMemo(() => scans.slice(0, 5), [scans]);

  return useMemo(() => ({
    scans,
    stats,
    recentScans,
    processScan,
    getScanById,
    deleteScan,
    clearAllScans,
  }), [scans, stats, recentScans, processScan, getScanById, deleteScan, clearAllScans]);
});

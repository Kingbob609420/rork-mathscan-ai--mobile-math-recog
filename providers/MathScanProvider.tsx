import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { generateText } from "@rork-ai/toolkit-sdk";

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
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();
      console.log('[convertImageToBase64] Blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Image file is empty');
      }
      
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (!result) {
              reject(new Error('FileReader returned empty'));
              return;
            }
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            console.log('[convertImageToBase64] Success, length:', base64.length);
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
      } else {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        bytes.forEach((b) => binary += String.fromCharCode(b));
        const base64 = btoa(binary);
        console.log('[convertImageToBase64] Success, length:', base64.length);
        return base64;
      }
    } catch (error) {
      console.error('[convertImageToBase64] Error:', error);
      throw error;
    }
  }, []);

  const analyzeImageQuality = useCallback(async (_base64Image: string): Promise<{ score: number; issues: string[] }> => {
    return { score: 75, issues: [] };
  }, []);

  const processScan = useCallback(async (imageUri: string): Promise<string> => {
    let attempts = 0;
    
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
        
        console.log('[processScan] Calling AI...');
        const prompt = `You are a math problem analyzer. Analyze this image and identify all math problems.

For each problem:
1. Extract the problem text
2. Identify problem type: 'arithmetic', 'algebra', 'geometry', or 'other'
3. Find the student's answer if present
4. Calculate the correct answer
5. Determine if student is correct (be lenient with formatting: "4" = "4.0", "x=4" = "4")
6. Provide explanation if wrong

For ± answers (quadratics, square roots): Accept EITHER positive or negative as correct.

Return ONLY a JSON array:
[
  {
    "problemText": "2 + 3 = ?",
    "userAnswer": "5",
    "correctAnswer": "5",
    "isCorrect": true,
    "problemType": "arithmetic",
    "explanation": null,
    "steps": null,
    "confidence": 95,
    "qualityIssues": []
  }
]

Analyze this math homework image:`;
        
        const completion = await generateText({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image", image: base64Image }
              ]
            }
          ]
        });
        
        console.log('[processScan] AI response received, length:', completion.length);
        
        let problems: MathProblem[] = [];
        try {
          const jsonMatch = completion.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            problems = JSON.parse(jsonMatch[0]);
          } else {
            problems = JSON.parse(completion);
          }
          
          if (!Array.isArray(problems) || problems.length === 0) {
            throw new Error('No problems found');
          }
          
          console.log('[processScan] Parsed', problems.length, 'problems');
        } catch (parseError) {
          console.error('[processScan] Parse error:', parseError);
          problems = [{
            problemText: 'Unable to parse problems from image',
            isCorrect: false,
            explanation: 'The image may be unclear or contain no math problems.',
            confidence: 0,
            qualityIssues: ['Parsing failed']
          }];
        }

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
        
        if (attempts < MAX_RETRIES) {
          console.log(`[processScan] Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Failed to process scan');
  }, [scans, saveScans, convertImageToBase64, analyzeImageQuality]);

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

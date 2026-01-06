import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import NetInfo from '@react-native-community/netinfo';
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
const RETRY_DELAY = 1000;
const API_TIMEOUT = 45000;

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

  const validateImageUri = useCallback((uri: string): boolean => {
    if (!uri || uri.trim() === '') {
      console.error('[validateImageUri] Empty URI');
      return false;
    }
    
    const validPrefixes = ['file://', 'http://', 'https://', 'content://', 'data:', 'blob:'];
    const hasValidPrefix = validPrefixes.some(prefix => uri.startsWith(prefix));
    
    if (!hasValidPrefix) {
      console.error('[validateImageUri] Invalid URI format:', uri.substring(0, 50));
      return false;
    }
    
    console.log('[validateImageUri] URI valid');
    return true;
  }, []);

  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      console.log('[checkNetworkConnectivity] Network state:', state);
      return state.isConnected === true && state.isInternetReachable !== false;
    } catch (error) {
      console.error('[checkNetworkConnectivity] Error checking network:', error);
      return true;
    }
  };



  const convertImageToBase64 = useCallback(async (uri: string): Promise<string> => {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        console.log(`[convertImageToBase64] Attempt ${retries + 1}/${MAX_RETRIES} - Converting image:`, uri.substring(0, 100));
        console.log("[convertImageToBase64] Platform:", Platform.OS);
        
        if (!uri || uri.trim() === '') {
          throw new Error("Empty URI provided");
        }
        
        if (uri.startsWith('data:image')) {
          console.log('[convertImageToBase64] Already base64 data URI, extracting...');
          const base64 = uri.split(',')[1];
          if (base64 && base64.length > 100) {
            return base64;
          }
          throw new Error('Invalid data URI format');
        }
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Image conversion timeout after 30s")), 30000)
        );
        
        if (Platform.OS !== 'web') {
          try {
            if (!validateImageUri(uri)) {
              throw new Error("Invalid image URI format");
            }
            
            const conversionPromise = (async () => {
              const response = await fetch(uri);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }
              const blob = await response.blob();
              console.log("[convertImageToBase64] Blob size:", blob.size, "bytes");
              
              if (blob.size === 0) {
                throw new Error("Image file is empty");
              }
              
              const arrayBuffer = await blob.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              let binary = '';
              bytes.forEach((b) => binary += String.fromCharCode(b));
              const base64 = btoa(binary);
              console.log("[convertImageToBase64] Base64 conversion successful (native), length:", base64.length);
              return base64;
            })();
            
            const result = await Promise.race([conversionPromise, timeoutPromise]);
            
            if (!result || result.length < 100) {
              throw new Error('Base64 result is too short or empty');
            }
            
            console.log('[convertImageToBase64] Conversion successful (native)');
            return result;
          } catch (fetchError) {
            console.error("[convertImageToBase64] Native conversion failed:", fetchError);
            throw fetchError;
          }
        } else {
          console.log('[convertImageToBase64] Web platform detected');
          console.log('[convertImageToBase64] URI type:', uri.startsWith('blob:') ? 'blob' : uri.startsWith('http') ? 'http' : uri.startsWith('file:') ? 'file' : 'unknown');
          
          const conversionPromise = new Promise<string>((resolve, reject) => {
            const isBlobUrl = uri.startsWith('blob:');
            console.log('[convertImageToBase64] Is blob URL:', isBlobUrl);
            
            if (isBlobUrl) {
              console.log('[convertImageToBase64] Fetching blob URL:', uri);
            }
            
            fetch(uri)
              .then(response => {
                console.log('[convertImageToBase64] Fetch response status:', response.status);
                if (!response.ok) {
                  throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                }
                return response.blob();
              })
              .then(blob => {
                console.log("[convertImageToBase64] Blob received, size:", blob.size, "bytes, type:", blob.type);
                if (blob.size === 0) {
                  throw new Error("Image file is empty (0 bytes)");
                }
                
                if (!blob.type.startsWith('image/')) {
                  console.warn('[convertImageToBase64] Blob type is not image:', blob.type);
                }
                
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  if (!result) {
                    reject(new Error("FileReader returned empty result"));
                    return;
                  }
                  console.log("[convertImageToBase64] FileReader complete, result length:", result.length);
                  const base64 = result.includes(',') ? result.split(',')[1] : result;
                  console.log("[convertImageToBase64] Base64 length:", base64.length);
                  if (base64.length < 100) {
                    reject(new Error(`Base64 too short: ${base64.length} chars`));
                    return;
                  }
                  console.log("[convertImageToBase64] Base64 conversion successful (web)");
                  resolve(base64);
                };
                reader.onerror = (error) => {
                  console.error('[convertImageToBase64] FileReader error:', error);
                  reject(new Error("FileReader failed to read blob"));
                };
                reader.onabort = () => {
                  console.error('[convertImageToBase64] FileReader aborted');
                  reject(new Error("FileReader was aborted"));
                };
                console.log('[convertImageToBase64] Starting FileReader.readAsDataURL...');
                reader.readAsDataURL(blob);
              })
              .catch(error => {
                console.error('[convertImageToBase64] Fetch/blob error:', error);
                reject(error);
              });
          });
          
          const result = await Promise.race([conversionPromise, timeoutPromise]);
          
          if (!result || result.length < 100) {
            throw new Error(`Base64 result invalid: length ${result?.length || 0}`);
          }
          
          console.log('[convertImageToBase64] Conversion successful (web)');
          return result;
        }
      } catch (error) {
        retries++;
        console.error(`[convertImageToBase64] Error (attempt ${retries}/${MAX_RETRIES}):`, error);
        console.error('[convertImageToBase64] Error details:', error instanceof Error ? error.message : String(error));
        
        if (retries < MAX_RETRIES) {
          console.log(`[convertImageToBase64] Retrying in ${RETRY_DELAY * retries}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        } else {
          console.error('[convertImageToBase64] All conversion attempts failed');
          throw new Error(`Failed to convert image after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    throw new Error('Failed to convert image');
  }, [validateImageUri]);

  const analyzeImageQuality = useCallback(async (base64Image: string): Promise<{ score: number; issues: string[] }> => {
    try {
      console.log('[analyzeImageQuality] Starting quality analysis...');
      
      const completion = await generateText({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an image quality analyzer for math homework scanning. Analyze the image quality and return a JSON object with:
{
  "score": 0-100 (100 being perfect quality),
  "issues": ["array of quality issues found"],
  "recommendations": ["array of recommendations to improve quality"]
}

Evaluate:
- Clarity and sharpness of text
- Lighting conditions (too dark, too bright, glare)
- Image blur or motion blur
- Text readability
- Paper orientation and alignment
- Presence of shadows or obstructions

Return ONLY the JSON object, no other text.

Analyze this image quality for math problem scanning:`
              },
              {
                type: "image",
                image: base64Image
              }
            ]
          }
        ]
      });
      
      try {
        const jsonMatch = completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            score: result.score || 50,
            issues: [...(result.issues || []), ...(result.recommendations || [])]
          };
        }
      } catch (e) {
        console.error("Error parsing quality response:", e);
      }
      
      return { score: 50, issues: [] };
    } catch (error) {
      console.error("[analyzeImageQuality] Error:", error);
      if (error instanceof Error) {
        console.error("[analyzeImageQuality] Error details:", error.message);
      }
      return { score: 50, issues: [] };
    }
  }, []);

  const processScan = useCallback(async (imageUri: string): Promise<string> => {
    let processingAttempts = 0;
    
    while (processingAttempts < MAX_RETRIES) {
      try {
        console.log(`[processScan] Starting scan process (attempt ${processingAttempts + 1}/${MAX_RETRIES}) for:`, imageUri);
        
        if (!imageUri || imageUri.trim() === '') {
          throw new Error("No image URI provided");
        }
        
        console.log('[processScan] Checking network connectivity...');
        const isConnected = await checkNetworkConnectivity();
        console.log('[processScan] Network connected:', isConnected);
        if (!isConnected) {
          throw new Error('No internet connection. Please check your network and try again.');
        }
        
        console.log("[processScan] Converting image to base64...");
        const base64Image = await convertImageToBase64(imageUri);
        console.log("[processScan] Base64 conversion complete. Length:", base64Image.length);
        
        if (!base64Image || base64Image.length < 100) {
          throw new Error('Invalid base64 image data');
        }
        
        console.log("[processScan] Analyzing image quality...");
        let imageQuality: { score: number; issues: string[] } = { score: 50, issues: [] };
        try {
          imageQuality = await analyzeImageQuality(base64Image);
          console.log("[processScan] Image quality:", imageQuality);
        } catch (qualityError) {
          console.warn('[processScan] Image quality analysis failed, continuing with default:', qualityError);
        }
        
        console.log("[processScan] Sending image to AI for analysis...");
        console.log('[processScan] API timeout set to:', API_TIMEOUT, 'ms');
        
        const systemPrompt = `You are an advanced math problem analyzer specializing in arithmetic, algebra, and geometry. Analyze the image and identify all math problems.

For each problem, you must:
1. Extract the problem text exactly as shown
2. Identify the problem type: 'arithmetic', 'algebra', 'geometry', or 'other'
3. Identify if there's a student answer present
4. Solve the problem step-by-step to get the correct answer
5. Check if the student answer is mathematically equivalent to the correct answer
6. Provide a detailed explanation with steps if wrong

IMPORTANT - ANSWER COMPARISON RULES:
When comparing the student's answer to the correct answer, consider them CORRECT if they are mathematically equivalent, even if formatted differently:
- "4" = "4.0" = "4 " = " 4" (whitespace doesn't matter)
- "1/2" = "0.5" = ".5" (different representations of the same value)
- "x=4" = "4" = "x = 4" (spacing and format variations)
- "15cm²" = "15 cm²" = "15" (with or without units, if units are in the problem)
- Case insensitive for variables: "X=4" = "x=4"
- Equivalent fractions: "2/4" = "1/2"
- Simplified vs unsimplified: "6/3" = "2"

CRITICAL RULE FOR ± (PLUS-MINUS) ANSWERS:
When solving equations (especially quadratic equations, square roots, absolute values), the complete solution often includes both positive AND negative values.

WHEN YOU DETERMINE THE CORRECT ANSWER HAS BOTH ± SOLUTIONS:
- You MUST mark the student answer as CORRECT if they wrote EITHER the positive OR negative solution
- You MUST mark the student answer as CORRECT if they wrote the ± symbol
- You MUST mark the student answer as CORRECT if they wrote both solutions

EXAMPLES THAT MUST BE MARKED CORRECT:
1. Problem: "Solve x² = 16"
   - Correct answer: "x = ±4" 
   - Accept as CORRECT: "4", "-4", "x=4", "x=-4", "x = 4", "x = -4", "±4", "x = ±4", "4 or -4"

2. Problem: "Solve |x| = 7"
   - Correct answer: "x = ±7"
   - Accept as CORRECT: "7", "-7", "x=7", "x=-7", "±7", "x = ±7"

3. Problem: "Find √25"
   - Correct answer: "±5" (if asking for all solutions)
   - Accept as CORRECT: "5", "-5", "±5"

REMEMBER: If ONE of the student's answers matches ONE of the correct solutions, mark it as CORRECT!
DO NOT mark it incorrect just because they didn't write the ± symbol or didn't write both solutions

Mark as CORRECT if the mathematical value is the same, regardless of formatting.

GEOMETRY PROBLEMS: For geometry (angles, shapes, area, perimeter, volume, triangles, circles):
- Identify all relevant formulas
- Show all calculation steps
- Include units in answers
- Explain geometric relationships

ALGEBRA PROBLEMS: For algebra (equations, inequalities, variables):
- Show all steps to isolate variables
- Explain each algebraic operation
- Simplify final answers
- Check solutions

ARITHMETIC PROBLEMS: For basic calculations:
- Show the computation
- Explain the operation

Return ONLY a JSON array with this exact structure:
[
  {
    "problemText": "Find the area of a rectangle with length 5cm and width 3cm",
    "userAnswer": "8cm²",
    "correctAnswer": "15cm²",
    "isCorrect": false,
    "problemType": "geometry",
    "explanation": "Area of rectangle = length × width",
    "steps": ["Formula: Area = l × w", "Area = 5cm × 3cm", "Area = 15cm²"],
    "confidence": 95,
    "qualityIssues": []
  },
  {
    "problemText": "Solve for x: 2x + 5 = 13",
    "userAnswer": "4",
    "correctAnswer": "4",
    "isCorrect": true,
    "problemType": "algebra",
    "explanation": null,
    "steps": null,
    "confidence": 98,
    "qualityIssues": []
  }
]

IMPORTANT QUALITY FIELDS:
- "confidence": A number from 0-100 indicating how confident you are in your analysis
  - 90-100: Very clear, no ambiguity
  - 70-89: Clear but some minor uncertainty
  - 50-69: Moderate uncertainty (blurry text, unclear handwriting)
  - Below 50: High uncertainty (very unclear, hard to read)
- "qualityIssues": Array of specific issues like ["Handwriting unclear", "Number ambiguous (could be 6 or 8)", "Partial text cutoff"]

Be honest about confidence. If handwriting is messy or text is unclear, lower the confidence and note the specific issues.

Important: Return ONLY the JSON array, no other text. Always include problemType, confidence, and qualityIssues.`;
        
        const completion = await generateText({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: systemPrompt + "\n\nAnalyze this math homework image and identify all problems:"
                },
                {
                  type: "image",
                  image: base64Image
                }
              ]
            }
          ]
        });
        
        console.log("[processScan] Parsing AI response...");
        console.log('[processScan] Completion length:', completion.length);
        
        let problems: MathProblem[] = [];
        try {
          const jsonMatch = completion.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            problems = JSON.parse(jsonMatch[0]);
          } else {
            problems = JSON.parse(completion);
          }
          
          if (!Array.isArray(problems) || problems.length === 0) {
            throw new Error('No problems found in response');
          }
          
          console.log('[processScan] Successfully parsed', problems.length, 'problems');
        } catch (parseError) {
          console.error("[processScan] Error parsing AI response:", parseError);
          console.error('[processScan] Raw completion:', completion.substring(0, 200));
          problems = [
            {
              problemText: "Unable to parse problems from image",
              isCorrect: false,
              explanation: "There was an error processing the AI response. The image may be unclear or contain no math problems.",
              confidence: 0,
              qualityIssues: ['AI response parsing failed']
            }
          ];
        }

        const scanId = Date.now().toString();
        const newScan: Scan = {
          id: scanId,
          timestamp: Date.now(),
          imageUri,
          problems,
          imageQuality,
        };

        console.log('[processScan] Saving scan to storage...');
        const updatedScans = [newScan, ...scans];
        await saveScans(updatedScans);

        console.log("[processScan] Scan complete! ID:", scanId);
        return scanId;
      } catch (error) {
        processingAttempts++;
        console.error(`[processScan] Error (attempt ${processingAttempts}/${MAX_RETRIES}):`, error);
        
        if (error instanceof Error) {
          console.error("[processScan] Error message:", error.message);
          console.error("[processScan] Error stack:", error.stack);
          console.error("[processScan] Error name:", error.name);
        }
        
        if (processingAttempts < MAX_RETRIES) {
          const isNetworkError = error instanceof Error && 
            (error.message.includes('network') || 
             error.message.includes('Network') ||
             error.message.includes('timeout') || 
             error.message.includes('fetch') ||
             error.message.includes('Unable to reach') ||
             error.message.toLowerCase().includes('connection') ||
             error.name === 'AbortError' ||
             error.name === 'TypeError');
          
          if (isNetworkError) {
            const delay = RETRY_DELAY * processingAttempts;
            console.log(`[processScan] Network error detected, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error('[processScan] Non-network error, not retrying:', error);
          }
        }
        
        console.error('[processScan] All processing attempts failed');
        throw error;
      }
    }
    
    throw new Error('Failed to process scan after all attempts');
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

import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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
  deleteScan: (id: string) => void;
  clearAllScans: () => Promise<void>;
}

const STORAGE_KEY = "mathscan_history";

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
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newScans));
      setScans(newScans);
    } catch (error) {
      console.error("Error saving scans:", error);
    }
  }, []);

  const loadScans = useCallback(async () => {
    try {
      console.log("[MathScanProvider] Loading scans...");
      
      if (Platform.OS === 'web') {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedScans = JSON.parse(stored);
          console.log("[MathScanProvider] Loaded", parsedScans.length, "scans");
          setScans(parsedScans);
        } else {
          console.log("[MathScanProvider] No scans found in storage");
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedScans = JSON.parse(stored);
          console.log("[MathScanProvider] Loaded", parsedScans.length, "scans");
          setScans(parsedScans);
        } else {
          console.log("[MathScanProvider] No scans found in storage");
        }
      }
      _setInitialized(true);
    } catch (error) {
      console.error("[MathScanProvider] Error loading scans:", error);
      console.error("[MathScanProvider] Error stack:", error instanceof Error ? error.stack : 'N/A');
      console.error("[MathScanProvider] Error name:", error instanceof Error ? error.name : 'N/A');
      console.error("[MathScanProvider] Error message:", error instanceof Error ? error.message : 'N/A');
      _setInitialized(true);
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

  const deleteScan = useCallback((id: string) => {
    const updatedScans = scans.filter(scan => scan.id !== id);
    saveScans(updatedScans);
  }, [scans, saveScans]);

  const clearAllScans = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setScans([]);
  }, []);



  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log("[MathScanProvider] Converting image to base64:", uri);
      console.log("[MathScanProvider] Platform:", Platform.OS);
      
      if (!uri || uri.trim() === '') {
        throw new Error("Invalid image URI: empty or undefined");
      }
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Image conversion timeout")), 30000)
      );
      
      if (Platform.OS !== 'web') {
        try {
          const conversionPromise = (async () => {
            const response = await fetch(uri);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            const blob = await response.blob();
            console.log("[MathScanProvider] Blob size:", blob.size, "bytes");
            
            if (blob.size === 0) {
              throw new Error("Image file is empty");
            }
            
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            bytes.forEach((b) => binary += String.fromCharCode(b));
            const base64 = btoa(binary);
            console.log("[MathScanProvider] Base64 conversion successful (native), length:", base64.length);
            return base64;
          })();
          
          return await Promise.race([conversionPromise, timeoutPromise]);
        } catch (fetchError) {
          console.error("[MathScanProvider] Fetch fallback failed:", fetchError);
          throw new Error(`Image conversion failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
      } else {
        const conversionPromise = new Promise<string>((resolve, reject) => {
          fetch(uri)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }
              return response.blob();
            })
            .then(blob => {
              console.log("[MathScanProvider] Blob size:", blob.size, "bytes");
              if (blob.size === 0) {
                throw new Error("Image file is empty");
              }
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                console.log("[MathScanProvider] Base64 conversion successful (web)");
                resolve(base64.split(',')[1]);
              };
              reader.onerror = () => reject(new Error("FileReader error"));
              reader.readAsDataURL(blob);
            })
            .catch(reject);
        });
        
        return await Promise.race([conversionPromise, timeoutPromise]);
      }
    } catch (error) {
      console.error("[MathScanProvider] Error converting image to base64:", error);
      throw error;
    }
  };

  const analyzeImageQuality = async (base64Image: string): Promise<{ score: number; issues: string[] }> => {
    try {
      const response = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an image quality analyzer for math homework scanning. Analyze the image quality and return a JSON object with:
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

Return ONLY the JSON object, no other text.`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image quality for math problem scanning:"
                },
                {
                  type: "image",
                  image: base64Image
                }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        return { score: 50, issues: [] };
      }

      const data = await response.json();
      const completion = data.completion;
      
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
      console.error("Error analyzing image quality:", error);
      return { score: 50, issues: [] };
    }
  };

  const processScan = useCallback(async (imageUri: string): Promise<string> => {
    try {
      console.log("[processScan] Starting scan process for:", imageUri);
      
      if (!imageUri) {
        throw new Error("No image URI provided");
      }
      
      console.log("[processScan] Converting image to base64...");
      const base64Image = await convertImageToBase64(imageUri);
      console.log("[processScan] Base64 conversion complete. Length:", base64Image.length);
      
      console.log("[processScan] Analyzing image quality...");
      const imageQuality = await analyzeImageQuality(base64Image);
      console.log("[processScan] Image quality:", imageQuality);
      
      console.log("[processScan] Sending image to AI for analysis...");
      const response = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an advanced math problem analyzer specializing in arithmetic, algebra, and geometry. Analyze the image and identify all math problems.

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

Important: Return ONLY the JSON array, no other text. Always include problemType, confidence, and qualityIssues.`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this math homework image and identify all problems:"
                },
                {
                  type: "image",
                  image: base64Image
                }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[processScan] API error response:", errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      console.log("[processScan] Parsing AI response...");
      const data = await response.json();
      const completion = data.completion;
      
      let problems: MathProblem[] = [];
      try {
        const jsonMatch = completion.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          problems = JSON.parse(jsonMatch[0]);
        } else {
          problems = JSON.parse(completion);
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        problems = [
          {
            problemText: "Unable to parse problems",
            isCorrect: false,
            explanation: "There was an error processing the image. Please try again."
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

      const updatedScans = [newScan, ...scans];
      await saveScans(updatedScans);

      console.log("[processScan] Scan complete! ID:", scanId);
      return scanId;
    } catch (error) {
      console.error("[processScan] Error details:", error);
      if (error instanceof Error) {
        console.error("[processScan] Error message:", error.message);
        console.error("[processScan] Error stack:", error.stack);
      }
      throw error;
    }
  }, [scans, saveScans]);

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

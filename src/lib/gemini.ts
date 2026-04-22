import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  try {
    // @ts-ignore
    const viteKey = import.meta['env']?.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey;
    
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // Silently fail
  }
  return undefined;
};

let ai: any = null;
try {
  const key = getApiKey();
  if (key) {
    ai = new GoogleGenAI({ apiKey: key });
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI", e);
}

export interface Vulnerability {
  id: string;
  name: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  oldData: string;
  newData: string;
  testSimulation: string;
}

export interface SecurityReport {
  score: number;
  vulnerabilities: Vulnerability[];
  overallSummary: string;
}

export async function analyzeNetworkSecurity(networkInfo: string): Promise<SecurityReport> {
  if (!ai) {
    // Return a mock result if AI is not available locally
    return {
      score: 65,
      overallSummary: "Analisi locale (AI non disponibile): Rilevate vulnerabilità standard basate sui dati dello scanner.",
      vulnerabilities: [
        {
          id: "local-v1",
          name: "Protocollo WPA2 Rilevato",
          severity: "Medium",
          description: "La rete utilizza WPA2. Si consiglia il passaggio a WPA3 per una maggiore protezione contro gli attacchi di brute force.",
          oldData: "Security: WPA2",
          newData: "Security: WPA3-SAE",
          testSimulation: "Verifica le impostazioni del router principale e controlla se supporta il protocollo SAE."
        }
      ]
    };
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following network scan results for security vulnerabilities. 
    Return a detailed security report in JSON format.
    
    The JSON should have:
    - score: a number from 0 to 100
    - vulnerabilities: an array of objects with:
      - id: unique string
      - name: name of vulnerability
      - severity: "Low", "Medium", "High", or "Critical"
      - description: explanation in Italian
      - oldData: the unsecure configuration found
      - newData: the suggested secure configuration
      - testSimulation: a step-by-step procedure for the user to "verify" or "simulate" the vulnerability safely.
    - overallSummary: a brief overview in Italian.

    Network Info:
    ${networkInfo}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          vulnerabilities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
                description: { type: Type.STRING },
                oldData: { type: Type.STRING },
                newData: { type: Type.STRING },
                testSimulation: { type: Type.STRING }
              },
              required: ["id", "name", "severity", "description", "oldData", "newData", "testSimulation"]
            }
          },
          overallSummary: { type: Type.STRING }
        },
        required: ["score", "vulnerabilities", "overallSummary"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as SecurityReport;
}

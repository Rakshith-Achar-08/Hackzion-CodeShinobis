import axios from "axios";

const API_BASE = "http://localhost:8000";

export interface ImportanceItem {
  word: string;
  score: number;
  startIndex: number;
}

export interface TrimmedResult {
  trimmed_prompt: string;
  original_token_count: number;
  trimmed_token_count: number;
  savings: number;
  trimmed_cost: number;
}

export interface CostBreakdown {
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

export interface AnalyzeResponse {
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  cost: CostBreakdown;
  importance: ImportanceItem[];
  response_text: string;
  trimmed: TrimmedResult;
}

export async function analyzePrompt(
  prompt: string,
  model: string,
  apiKey: string
): Promise<AnalyzeResponse> {
  const res = await axios.post<AnalyzeResponse>(`${API_BASE}/analyze`, {
    prompt,
    model,
    api_key: apiKey,
  });
  return res.data;
}

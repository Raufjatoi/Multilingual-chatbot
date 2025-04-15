
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface FileInfo {
  name: string;
  type: string;
  content: string;
  size: number;
}

export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
}

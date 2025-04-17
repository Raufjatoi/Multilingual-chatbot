import { API_KEYS } from "@/config/api-config";
import { ChatMessage, FileInfo, WebSearchResult } from "@/types/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Keep file context in memory
let fileContextStore: FileInfo[] = [];

export const addFilesToContext = (files: FileInfo[]) => {
  fileContextStore = [...fileContextStore, ...files];
};

export const clearFileContext = () => {
  fileContextStore = [];
};

export const sendMessageToGroq = async (
  messages: ChatMessage[],
  files: FileInfo[] = [],
  searchResults: WebSearchResult[] = []
): Promise<string> => {
  try {
    let contextText = formatChatHistory(messages);

    // Add context from both current files and stored files
    const allFiles = [...fileContextStore, ...files];
    if (allFiles.length > 0) {
      contextText += `\n\nContext from uploaded files:\n${formatFilesContent(allFiles)}`;
    }
    
    if (searchResults.length > 0) {
      contextText += `\n\nWeb search results:\n${formatSearchResults(searchResults)}`;
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "compound-beta",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that can analyze and answer questions about uploaded files. When referencing files, mention their names explicitly."
          },
          { 
            role: "user", 
            content: contextText 
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error sending message to Groq:", error);
    return "Sorry, I encountered an error. Please try again.";
  }
};

const formatChatHistory = (messages: ChatMessage[]): string => {
  return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
};

const formatFilesContent = (files: FileInfo[]): string => {
  return files.map(file => 
    `File: ${file.name}\nContent: ${file.content}\n---\n`
  ).join("\n");
};

const formatSearchResults = (results: WebSearchResult[]): string => {
  return results.map(result => 
    `Title: ${result.title}\nLink: ${result.link}\nSnippet: ${result.snippet}`
  ).join("\n\n");
};

export const generateChatResponse = async (
  messages: ChatMessage[], 
  language: string = "en"
): Promise<string> => {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'tr': 'Turkish',
    'ur': 'Urdu',
    'hi': 'Hindi',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ar': 'Arabic'
  };

  const languageName = languageMap[language] || 'English';
  
  const messagesWithLang: ChatMessage[] = [
    ...messages,
    { 
      role: "system", 
      content: `Please respond in ${languageName} language. If the response contains any text, ensure it is properly formatted in ${languageName}.` 
    }
  ];
  
  return sendMessageToGroq(messagesWithLang);
};

export const processFileContent = async (
  fileContent: string, 
  query: string, 
  language: string = "en"
): Promise<string> => {
  try {
    const messages: ChatMessage[] = [
      { 
        role: "system", 
        content: `You are analyzing the following file content. Please provide a detailed response in ${language} language.` 
      },
      { 
        role: "user", 
        content: `Here is the file content:\n\n${fileContent}\n\nUser's question: ${query}` 
      }
    ];
    
    return await sendMessageToGroq(messages);
  } catch (error) {
    console.error("Error processing file content:", error);
    throw new Error("Failed to process file content");
  }
};

export const searchWeb = async (query: string, language: string = "en"): Promise<string> => {
  try {
    const messages: ChatMessage[] = [
      { 
        role: "system", 
        content: `You are a search engine assistant. For the following search query, 
                 provide relevant, factual information in ${language} language. 
                 Format your response as if showing search results, including:
                 - A brief summary of the topic
                 - Key facts and details
                 - Any relevant dates or statistics
                 - Common questions people ask about this topic
                 Keep the response informative but concise.` 
      },
      { 
        role: "user", 
        content: `Search query: ${query}`
      }
    ];
    
    return await sendMessageToGroq(messages);
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};




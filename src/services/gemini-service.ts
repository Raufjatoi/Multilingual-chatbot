
import { API_KEYS } from "@/config/api-config";
import { ChatMessage, FileInfo, WebSearchResult } from "@/types/types";

// Send a message to the Gemini API and get a response
export const sendMessageToGemini = async (
  messages: ChatMessage[],
  files: FileInfo[] = [],
  searchResults: WebSearchResult[] = []
): Promise<string> => {
  try {
    // Create payload for the Gemini API
    const payload = {
      contents: [
        {
          parts: [
            { text: formatChatHistory(messages) }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    // Add context from files if available
    if (files.length > 0) {
      payload.contents[0].parts[0].text += `\n\nContext from uploaded files:\n${formatFilesContent(files)}`;
    }
    
    // Add web search results if available
    if (searchResults.length > 0) {
      payload.contents[0].parts[0].text += `\n\nWeb search results:\n${formatSearchResults(searchResults)}`;
    }

    // Make the API request
    const response = await fetch(`${API_KEYS.GEMINI_API_URL}?key=${API_KEYS.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "Sorry, I encountered an error. Please try again.";
  }
};

// Format the entire chat history for the API
const formatChatHistory = (messages: ChatMessage[]): string => {
  return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
};

// Format the content of uploaded files
const formatFilesContent = (files: FileInfo[]): string => {
  return files.map(file => `File: ${file.name}\nContent: ${file.content}\n`).join("\n");
};

// Format web search results
const formatSearchResults = (results: WebSearchResult[]): string => {
  return results.map(result => 
    `Title: ${result.title}\nLink: ${result.link}\nSnippet: ${result.snippet}`
  ).join("\n\n");
};

// Renamed functions to match what's expected in Index.tsx
export const generateChatResponse = async (
  messages: ChatMessage[], 
  language: string = "en"
): Promise<string> => {
  // Add language context to the messages
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
  
  return sendMessageToGemini(messagesWithLang);
};

// Function to process file content
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
    
    return await sendMessageToGemini(messages);
  } catch (error) {
    console.error("Error processing file content:", error);
    throw new Error("Failed to process file content");
  }
};

// Updated web search function to return a string response
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
    
    return await sendMessageToGemini(messages);
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

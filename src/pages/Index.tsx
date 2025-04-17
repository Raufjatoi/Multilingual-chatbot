
import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { FileUploadPanel } from "@/components/FileUploadPanel";
import { Footer } from "@/components/Footer";
import { ChatMessage, FileInfo } from "@/types/types";
import { 
  generateChatResponse, 
  processFileContent, 
  searchWeb,
  addFilesToContext,
  clearFileContext,
  sendMessageToGroq
} from "@/services/groq-service";
import { VoiceService } from "@/services/voice-service";
import { BubbleScene } from "@/components/SimpleChatBubbles";
import { Loader2 } from "lucide-react";
import * as mammoth from 'mammoth';

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [initialized, setInitialized] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize voice service
  useEffect(() => {
    const init = async () => {
      try {
        await VoiceService.init();
        setInitialized(true);
      } catch (error) {
        console.error("Failed to initialize voice service:", error);
        setInitialized(true); // Continue even if voice service fails
      }
    };
    
    init();
  }, []);

  // Handle sending a message
  const handleSendMessage = async (message: string, language: string) => {
    const userMessage: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      let response: string;
      
      if (uploadedFiles.length > 0 && 
          (message.toLowerCase().includes("file") || 
           message.toLowerCase().includes("document") ||
           message.toLowerCase().includes("uploaded"))) {
        
        // Create messages array for context
        const contextMessages = [
          ...messages,
          userMessage
        ];
        
        response = await sendMessageToGroq(contextMessages, uploadedFiles);
      } else {
        response = await generateChatResponse([userMessage], language);
      }
      
      const assistantMessage: ChatMessage = { role: "assistant", content: response };
      setMessages((prev) => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: ChatMessage = { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error. Please try again." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    try {
      const newFiles: FileInfo[] = [];
      const maxFileSize = 10 * 1024 * 1024; // 10MB limit
      const allowedTypes = [
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json',
        'text/javascript',
        'text/typescript',
        'text/html',
        'text/css',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > maxFileSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
        }
        
        const isAllowedType = allowedTypes.includes(file.type) || 
                             allowedTypes.some(type => file.name.toLowerCase().endsWith(type.split('/')[1])) ||
                             file.name.toLowerCase().endsWith('.docx') ||
                             file.name.toLowerCase().endsWith('.doc') ||
                             file.name.toLowerCase().endsWith('.pdf');
                             
        if (!isAllowedType) {
          throw new Error(`File type not supported for ${file.name}`);
        }
        
        setIsLoading(true);
        
        const fileContent = await readFileContent(file);
        
        const newFile: FileInfo = {
          name: file.name,
          type: file.type,
          content: fileContent,
          size: file.size
        };
        
        newFiles.push(newFile);
      }
      
      // Add files to global context
      addFilesToContext(newFiles);
      
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      
      const fileNames = newFiles.map(file => file.name).join(", ");
      const systemMessage: ChatMessage = { 
        role: "system", 
        content: `Files uploaded successfully: ${fileNames}. You can now ask questions about these files.` 
      };
      setMessages((prev) => [...prev, systemMessage]);
      
    } catch (error) {
      console.error("Error uploading files:", error);
      const errorMessage: ChatMessage = { 
        role: "assistant", 
        content: `Error uploading files: ${error.message}` 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Read file content
  const readFileContent = async (file: File): Promise<string> => {
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Failed to read PDF file"));
            }
          };
          reader.onerror = () => {
            reject(new Error(`Failed to read PDF file: ${file.name}`));
          };
          reader.readAsText(file);
        });
      } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } else {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = () => {
            reject(new Error(`Failed to read file: ${file.name}`));
          };
          reader.readAsText(file);
        });
      }
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error(`Failed to read file: ${file.name}`);
    }
  };

  // Handle voice input
  const handleVoiceInput = () => {
    const currentLang = messages.length > 0 && messages[messages.length - 1].role === "assistant" 
      ? "en" // Default to English for simplicity
      : "en";
    
    // Add a temporary message
    const tempMessage: ChatMessage = { 
      role: "system", 
      content: "Listening... Speak now." 
    };
    setMessages((prev) => [...prev, tempMessage]);
    
    // Start voice recognition
    VoiceService.startVoiceRecognition(
      currentLang,
      (text) => {
        // Remove temporary message
        setMessages((prev) => prev.slice(0, prev.length - 1));
        
        // Add recognized text as user message
        const userMessage: ChatMessage = { role: "user", content: text };
        setMessages((prev) => [...prev, userMessage]);
        
        // Process the message
        handleSendMessage(text, currentLang);
      },
      (error) => {
        console.error("Voice recognition error:", error);
        
        // Remove temporary message
        setMessages((prev) => prev.slice(0, prev.length - 1));
        
        // Add error message
        const errorMessage: ChatMessage = { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error with voice recognition. Please try typing your message instead." 
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    );
  };

  // Handle text to speech
  const handleTextToSpeech = async (text: string) => {
    try {
      // Determine language from recent messages
      const currentLang = messages.length > 0 && messages[messages.length - 1].role === "assistant" 
        ? "en" // Default to English for simplicity
        : "en";
      
      await VoiceService.speak(text, currentLang);
    } catch (error) {
      console.error("Text to speech error:", error);
    }
  };

  // Handle web search
  const handleWebSearch = async (query: string) => {
    const userMessage: ChatMessage = { 
      role: "user", 
      content: `🔍 Search: ${query}` 
    };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      const response = await searchWeb(query);
      
      const searchMessage: ChatMessage = { 
        role: "assistant", 
        content: response
      };
      setMessages((prev) => [...prev, searchMessage]);
      
    } catch (error) {
      console.error("Search error:", error);
      
      const errorMessage: ChatMessage = { 
        role: "assistant", 
        content: "I couldn't complete the search. Please try again." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removing a file
  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter(file => file.name !== fileName));
    
    // Add system message about removed file
    const systemMessage: ChatMessage = { 
      role: "system", 
      content: `File removed: ${fileName}` 
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Add a function to clear file context
  const handleClearFiles = () => {
    clearFileContext();
    setUploadedFiles([]);
    const systemMessage: ChatMessage = { 
      role: "system", 
      content: "All uploaded files have been cleared." 
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Show loading screen while initializing
  if (!initialized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg">Initializing Multilingual Assistant...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Three.js Background in a fixed position canvas */}
      <div className="fixed inset-0 -z-10">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
        <BubbleScene canvasRef={canvasRef} />
      </div>

      {/* Main content with backdrop blur for readability */}
      <div className="flex-1 flex flex-col p-4 md:p-6 backdrop-blur-sm bg-background/70">
        <div className="container mx-auto max-w-4xl flex-1 flex flex-col">
          <FileUploadPanel 
            files={uploadedFiles} 
            onRemoveFile={handleRemoveFile} 
          />
          <ChatInterface 
            onSendMessage={handleSendMessage} 
            messages={messages} 
            isLoading={isLoading} 
            onFileUpload={handleFileUpload}
            onVoiceInput={handleVoiceInput}
            onTextToSpeech={handleTextToSpeech}
            onWebSearch={handleWebSearch}
          />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;

// sendMessageToGroq function removed as it's now in the service

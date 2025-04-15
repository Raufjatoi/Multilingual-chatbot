
import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { FileUploadPanel } from "@/components/FileUploadPanel";
import { Footer } from "@/components/Footer";
import { ChatMessage, FileInfo } from "@/types/types";
import { generateChatResponse, processFileContent, searchWeb } from "@/services/gemini-service";
import { VoiceService } from "@/services/voice-service";
import { BubbleScene } from "@/components/SimpleChatBubbles";
import { Loader2 } from "lucide-react";

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
    // Add user message to the chat
    const userMessage: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      let response: string;
      
      // Check if the message is related to an uploaded file
      if (uploadedFiles.length > 0 && 
          (message.toLowerCase().includes("file") || 
           message.toLowerCase().includes("document") ||
           message.toLowerCase().includes("uploaded"))) {
        
        // Combine all file contents
        const combinedContent = uploadedFiles.map(file => 
          `File: ${file.name}\n${file.content}\n\n`
        ).join("");
        
        response = await processFileContent(combinedContent, message, language);
      } else {
        // Regular chat response
        response = await generateChatResponse([userMessage], language);
      }
      
      // Add assistant response to the chat
      const assistantMessage: ChatMessage = { role: "assistant", content: response };
      setMessages((prev) => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
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
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Read file content
        const fileContent = await readFileContent(file);
        
        newFiles.push({
          name: file.name,
          type: file.type,
          content: fileContent,
          size: file.size
        });
      }
      
      // Add files to state
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      
      // Add system message about uploaded files
      const fileNames = newFiles.map(file => file.name).join(", ");
      const systemMessage: ChatMessage = { 
        role: "system", 
        content: `Files uploaded: ${fileNames}. You can ask questions about these files.` 
      };
      setMessages((prev) => [...prev, systemMessage]);
      
    } catch (error) {
      console.error("Error uploading files:", error);
      
      // Add error message
      const errorMessage: ChatMessage = { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error uploading your files. Please try again." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      // Text files
      if (file.type.includes("text") || 
          file.type.includes("application/json") ||
          file.type.includes("application/xml") ||
          file.name.endsWith(".csv") ||
          file.name.endsWith(".md") ||
          file.name.endsWith(".js") ||
          file.name.endsWith(".ts") ||
          file.name.endsWith(".html") ||
          file.name.endsWith(".css")) {
        reader.readAsText(file);
      } 
      // PDF files would need a PDF.js integration
      else {
        // For unsupported file types, just read as text
        reader.readAsText(file);
      }
    });
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
    // Add user message to the chat
    const userMessage: ChatMessage = { 
      role: "user", 
      content: `Search the web for: ${query}` 
    };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      // Determine language
      const currentLang = "en"; // Default to English for search
      
      // Search the web
      const response = await searchWeb(query, currentLang);
      
      // Add search results to the chat
      const searchMessage: ChatMessage = { 
        role: "assistant", 
        content: response
      };
      setMessages((prev) => [...prev, searchMessage]);
      
    } catch (error) {
      console.error("Web search error:", error);
      
      // Add error message
      const errorMessage: ChatMessage = { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error searching the web. Please try again." 
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

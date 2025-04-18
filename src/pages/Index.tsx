
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
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(false);
  const messageMemory = useRef<ChatMessage[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleToggleMemory = (enabled: boolean) => {
    setIsMemoryEnabled(enabled);
    if (!enabled) {
      messageMemory.current = [];
    }
  };

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
    if (!message.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let contextMessages: ChatMessage[] = [];
      
      if (isMemoryEnabled) {
        // Keep last 5 messages for context
        messageMemory.current = [...messageMemory.current, userMessage].slice(-5);
        contextMessages = messageMemory.current;
      } else {
        contextMessages = [userMessage];
      }

      let response: string;
      if (uploadedFiles.length > 0 && 
          (message.toLowerCase().includes("file") || 
           message.toLowerCase().includes("document") ||
           message.toLowerCase().includes("uploaded"))) {
        response = await sendMessageToGroq(contextMessages, uploadedFiles);
      } else {
        response = await generateChatResponse(contextMessages, language);
      }

      const assistantMessage: ChatMessage = { role: "assistant", content: response };
      setMessages((prev) => [...prev, assistantMessage]);
      
      if (isMemoryEnabled) {
        messageMemory.current = [...messageMemory.current, assistantMessage].slice(-5);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    try {
      const newFiles: FileInfo[] = [];
      const maxFileSize = 20 * 1024 * 1024; // Increased to 20MB limit
      
      setIsLoading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > maxFileSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is 20MB.`);
        }
        
        const fileContent = await readFileContent(file);
        
        const newFile: FileInfo = {
          name: file.name,
          type: file.type || `application/${file.name.split('.').pop()}`,
          content: fileContent,
          size: file.size
        };
        
        newFiles.push(newFile);
      }
      
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      addFilesToContext(newFiles);
      
      const successMessage: ChatMessage = {
        role: "assistant",
        content: `Successfully processed ${newFiles.length} file(s): ${newFiles.map(f => f.name).join(', ')}`
      };
      setMessages((prev) => [...prev, successMessage]);
      
    } catch (error) {
      console.error("Error uploading files:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Error processing files: ${error.message}`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Read file content
  const readFileContent = async (file: File): Promise<string> => {
    try {
      // Binary file types that should be base64 encoded
      const binaryTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/x-7z-compressed'
      ];

      // Text file types
      const textTypes = [
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json',
        'text/javascript',
        'text/typescript',
        'application/javascript',
        'application/typescript',
        'text/html',
        'text/css',
        'text/xml',
        'application/xml',
        'text/yaml',
        'text/x-python',
        'text/x-java',
        'text/x-c',
        'text/x-cpp',
        'text/x-ruby',
        'text/x-php',
        'text/x-go'
      ];

      // Check file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      const isBinaryByExtension = [
        'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
        'jpg', 'jpeg', 'png', 'gif', 'webp',
        'zip', 'rar', '7z',
        'exe', 'dll', 'bin'
      ].includes(extension || '');

      // Determine if file should be treated as binary
      const isBinary = binaryTypes.includes(file.type) || isBinaryByExtension;

      if (isBinary) {
        // Handle binary files
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        return `[Binary content - ${file.type || extension}] ${base64}`;
      } else {
        // Handle text files
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
            onToggleMemory={handleToggleMemory}
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

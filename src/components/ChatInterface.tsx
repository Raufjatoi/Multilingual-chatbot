
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Upload, PlusCircle, Send, Volume2, Search, FileText } from "lucide-react";
import { ChatMessage } from "@/types/types";

interface ChatInterfaceProps {
  onSendMessage: (message: string, language: string) => Promise<void>;
  messages: ChatMessage[];
  isLoading: boolean;
  onFileUpload: (files: FileList) => void;
  onVoiceInput: () => void;
  onTextToSpeech: (text: string) => void;
  onWebSearch: (query: string) => void;
}

const languages = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "tr", label: "Turkish" },
];

export const ChatInterface = ({
  onSendMessage,
  messages,
  isLoading,
  onFileUpload,
  onVoiceInput,
  onTextToSpeech,
  onWebSearch,
}: ChatInterfaceProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const [language, setLanguage] = useState("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      await onSendMessage(inputMessage, language);
      setInputMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSearch = () => {
    if (inputMessage.trim()) {
      onWebSearch(inputMessage);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-primary">Multilingual Assistant</h2>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-grow overflow-hidden mb-4">
        <CardContent className="p-4 h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="mb-4 text-6xl">👋</div>
              <p className="text-xl font-medium mb-2">Welcome to Multilingual Assistant</p>
              <p className="text-center max-w-md">
                Ask me anything in English, Urdu, Hindi, Chinese, and more languages. I can help you with information, answer questions about uploaded files, and search the web.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="prose dark:prose-invert">
                      {message.content}
                    </div>
                    {message.role === "assistant" && message.content && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 mt-2"
                        onClick={() => onTextToSpeech(message.content)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative">
        <Textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[60px] pr-32"
        />
        <div className="absolute right-2 bottom-2 flex space-x-1">
          <Button variant="ghost" size="icon" onClick={onVoiceInput} title="Voice Input">
            <Mic className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFileClick} title="Upload File">
            <Upload className="h-5 w-5" />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSearch} title="Search Web">
            <Search className="h-5 w-5" />
          </Button>
          <Button onClick={handleSendMessage} disabled={isLoading}>
            <Send className="h-5 w-5 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

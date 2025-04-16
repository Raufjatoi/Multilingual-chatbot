
// Array to store the supported voices
let voices: SpeechSynthesisVoice[] = [];

// Initialize voices when the browser is ready
function initVoices() {
  return new Promise<void>((resolve) => {
    // If speechSynthesis is available
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        // If voices aren't loaded yet, wait for the voiceschanged event
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          resolve();
        };
      } else {
        resolve();
      }
    } else {
      console.error("Speech synthesis not supported");
      resolve();
    }
  });
}

// Get the best matching voice for a given language code
function getBestVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }

  // Try to find an exact match for the language code
  const exactMatch = voices.find(voice => voice.lang.startsWith(langCode));
  if (exactMatch) return exactMatch;

  // If no exact match, find a voice that starts with the same language code
  // e.g., if langCode is 'zh', match voices with 'zh-CN', 'zh-HK', etc.
  const partialMatch = voices.find(voice => voice.lang.startsWith(langCode));
  if (partialMatch) return partialMatch;

  // Default to the first voice if no match
  return voices[0];
}

// Initialize speech recognition
let recognition: any = null;

function initSpeechRecognition(language: string = 'en-US'): any {
  if (typeof window !== 'undefined') {
    // Check for browser support
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      const instance = new SpeechRecognitionAPI();
      instance.continuous = false;
      instance.interimResults = false;
      instance.lang = language;
      
      return instance;
    }
  }
  
  console.error("Speech recognition not supported");
  return null;
}

export const VoiceService = {
  // Initialize the voice service
  init: async () => {
    await initVoices();
  },
  
  // Text to speech function
  speak: (text: string, language: string = 'en') => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }
      
      // Create a new speech synthesis utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Map language code to speech synthesis language code
      const langMap: Record<string, string> = {
        'en': 'en-US',
        'ur': 'ur-PK',
        'hi': 'hi-IN',
        'zh': 'zh-CN',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'ar': 'ar-SA',
        'tr': 'tr-TR', // Added Turkish
      };
      
      // Set the language for the utterance
      utterance.lang = langMap[language] || 'en-US';
      
      // Try to get the best voice for the language
      const voice = getBestVoiceForLanguage(utterance.lang);
      if (voice) {
        utterance.voice = voice;
      }
      
      // Set event handlers
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
    });
  },
  
  // Start voice recognition
  startVoiceRecognition: (language: string = 'en', onResult: (text: string) => void, onError: (error: Error) => void) => {
    // Map language code to speech recognition language code
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'ur': 'ur-PK',
      'hi': 'hi-IN',
      'zh': 'zh-CN',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ar': 'ar-SA',
    };
    
    const recognitionLang = langMap[language] || 'en-US';
    
    // Initialize speech recognition
    recognition = initSpeechRecognition(recognitionLang);
    
    if (!recognition) {
      onError(new Error("Speech recognition not supported"));
      return;
    }
    
    // Set up event handlers
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      onResult(result);
    };
    
    recognition.onerror = (event) => {
      onError(new Error(`Speech recognition error: ${event.error}`));
    };
    
    // Start listening
    recognition.start();
  },
  
  // Stop voice recognition
  stopVoiceRecognition: () => {
    if (recognition) {
      recognition.stop();
    }
  }
};

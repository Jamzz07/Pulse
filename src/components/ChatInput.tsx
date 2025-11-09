import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Loader2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { processFile, ProcessedFile } from "@/utils/fileProcessor";

interface ChatInputProps {
  onSend: (message: string, file?: File, processedFile?: ProcessedFile) => void;
  disabled?: boolean;
}

// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setMessage(prev => prev + finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          toast({
            title: "Speech recognition error",
            description: `Error: ${event.error}`,
            variant: "destructive",
          });
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleSpeechRecognition = () => {
    if (!speechSupported) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 20MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsProcessingFile(true);

    try {
      // Process the file to extract content
      console.log('Processing file:', file.name, file.type);
      const processed = await processFile(file);
      console.log('Processed file result:', processed);
      setProcessedFile(processed);

      if (processed.error) {
        console.error('File processing error:', processed.error);
        toast({
          title: "File processing error",
          description: processed.error,
          variant: "destructive",
        });
      } else {
        console.log('File processed successfully, content length:', processed.content.length);
        toast({
          title: "File processed successfully",
          description: `Extracted ${processed.content.length} characters from ${file.name}`,
        });
      }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    } catch (error) {
      toast({
        title: "File processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setProcessedFile(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSend = () => {
    if (!message.trim() && !selectedFile) return;

    // Stop speech recognition when sending
    if (isListening) {
      recognitionRef.current?.stop();
    }

    onSend(message.trim(), selectedFile || undefined, processedFile || undefined);
    setMessage("");
    setSelectedFile(null);
    setProcessedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setProcessedFile(null);
    setPreviewUrl(null);
    setIsProcessingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      {(previewUrl || selectedFile) && (
        <div className="mb-3 mx-6 flex items-center gap-3 p-3 bg-secondary rounded-lg">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
              {isProcessingFile ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <FileText className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile?.name}</p>
            <p className="text-xs text-muted-foreground">
              {selectedFile && (selectedFile.size / 1024).toFixed(1)} KB
              {isProcessingFile && " • Extracting content..."}
              {processedFile && !isProcessingFile && !processedFile.error && " • Content extracted ✓"}
              {processedFile?.error && " • Processing failed"}
            </p>
            {processedFile && !isProcessingFile && !processedFile.error && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Text content successfully extracted
              </p>
            )}
            {processedFile?.error && (
              <p className="text-xs text-red-500 mt-1">
                ⚠ {processedFile.error}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeFile}
            className="flex-shrink-0"
            disabled={isProcessingFile}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <div className="mx-6 mb-6">
        <div className="flex gap-3 items-end bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-3 shadow-xl shadow-black/10 hover:shadow-black/20 transition-all duration-300">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv,.md,.xml,.html,.js,.ts,.py,.java,.cpp,.c"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 h-8 w-8 rounded-full hover:bg-accent"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Pulse..."
            disabled={disabled}
            className="flex-1 min-h-0 h-8 py-0 border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 leading-8"
            rows={1}
          />

          <Button
            onClick={toggleSpeechRecognition}
            disabled={disabled || !speechSupported}
            size="icon"
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-full transition-all duration-300",
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : speechSupported
                ? "bg-muted hover:bg-accent"
                : "bg-muted/50 cursor-not-allowed"
            )}
            title={
              !speechSupported
                ? "Speech recognition not supported"
                : isListening
                ? "Stop listening"
                : "Start voice input"
            }
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          <Button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !selectedFile)}
            size="icon"
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-full transition-all duration-300",
              !disabled && (message.trim() || selectedFile)
                ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 scale-110"
                : "bg-muted hover:bg-accent"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;

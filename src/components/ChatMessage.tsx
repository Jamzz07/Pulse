import { Activity, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseTextSegments, TextSegment } from "@/utils/markdownParser";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  fileName?: string;
}

const ChatMessage = ({ role, content, imageUrl, fileName }: ChatMessageProps) => {
  const isUser = role === "user";
  
  // Render formatted text with proper styling
  const renderFormattedContent = (text: string) => {
    const segments = parseTextSegments(text);
    
    return segments.map((segment: TextSegment, index: number) => {
      // Handle special formatting for lists and structured content
      let content = segment.content;
      
      // Convert bullet points and lists
      if (content.includes('•')) {
        content = content.split('\n').map(line => {
          if (line.trim().startsWith('•')) {
            return line.replace('•', '•');
          }
          return line;
        }).join('\n');
      }
      
      return (
        <span
          key={index}
          className={cn(
            segment.bold && "font-bold text-foreground",
            segment.italic && "italic",
            segment.code && "bg-muted/80 px-1.5 py-0.5 rounded font-mono text-xs border",
            segment.strikethrough && "line-through opacity-75"
          )}
        >
          {content}
        </span>
      );
    });
  };

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary" : "bg-accent"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Activity className="w-5 h-5 text-accent-foreground" />
        )}
      </div>
      
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-chat-user text-chat-user-foreground rounded-tr-none"
            : "bg-chat-ai text-chat-ai-foreground rounded-tl-none"
        )}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Attached"
            className="rounded-lg max-w-full h-auto max-h-64 object-contain"
          />
        )}
        
        {fileName && (
          <div className="text-xs px-2 py-1 bg-muted rounded-md">
            📎 {fileName}
          </div>
        )}
        
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed space-y-1">
          {content.split('\n\n').map((paragraph, paragraphIndex) => (
            <div key={paragraphIndex} className={cn(
              paragraph.trim() && "mb-2 last:mb-0",
              paragraph.includes('**') && "space-y-1"
            )}>
              {renderFormattedContent(paragraph)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

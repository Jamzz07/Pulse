import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { useChatHistory } from "@/hooks/useChatHistory";
import { Activity, Plus, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { DocumentManager } from "@/components/DocumentManager";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const Index = () => {
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
  
  const {
    sessions,
    currentSessionId,
    currentSession,
    createNewSession,
    updateSession,
    deleteSession,
    switchToSession,
    clearAllSessions,
  } = useChatHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessagesRef = useRef<any[]>([]);
  const isUpdatingRef = useRef(false);

  // Handle messages update for current session with proper debouncing
  const handleMessagesUpdate = useCallback((messages: any[]) => {
    if (!currentSessionId || isUpdatingRef.current) return;
    
    // Prevent loops during updates
    isUpdatingRef.current = true;
    
    try {
      // Create a stable comparison using JSON serialization for content
      const currentMessagesHash = messages.map(m => `${m.role}:${m.content}:${m.timestamp?.getTime() || 0}`).join('|');
      const lastMessagesHash = lastMessagesRef.current.map(m => `${m.role}:${m.content}:${m.timestamp?.getTime() || 0}`).join('|');
      
      // Only update if the actual content changed
      if (currentMessagesHash !== lastMessagesHash && messages.length > 0) {
        lastMessagesRef.current = [...messages]; // Create a new array to avoid reference issues
        
        // Use setTimeout to debounce rapid updates
        setTimeout(() => {
          updateSession(currentSessionId, messages);
          isUpdatingRef.current = false;
        }, 100);
      } else {
        isUpdatingRef.current = false;
      }
    } catch (error) {
      console.error('Error in handleMessagesUpdate:', error);
      isUpdatingRef.current = false;
    }
  }, [currentSessionId, updateSession]);

  // Memoize initial messages to prevent unnecessary re-initializations
  const initialMessages = useMemo(() => 
    currentSession?.messages || [], 
    [currentSession?.id, currentSession?.messages?.length]
  );

  const { messages, isLoading, sendMessage } = useChat(
    initialMessages,
    handleMessagesUpdate
  );

  // Create initial session if none exists
  useEffect(() => {
    if (!currentSessionId && sessions.length === 0) {
      createNewSession();
    }
  }, [currentSessionId, sessions.length, createNewSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gradient-start to-gradient-end">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <ChatHistorySidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onCreateNewChat={createNewSession}
            onSelectChat={switchToSession}
            onDeleteChat={deleteSession}
            onClearAll={clearAllSessions}
          />
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-6 h-6 text-primary-foreground animate-pulse" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Pulse</h1>
            <p className="text-xs text-muted-foreground">Your AI companion</p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={isDocumentManagerOpen} onOpenChange={setIsDocumentManagerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  title="Document Storage"
                >
                  <FileText className="h-4 w-4" />
                  <span className="sr-only">Document Storage</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[500px] sm:w-[620px]">
                <SheetHeader>
                  <SheetTitle>Document Storage</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <DocumentManager 
                    onDocumentSelect={(fileName) => {
                      sendMessage(`Tell me about the document: ${fileName}`);
                      setIsDocumentManagerOpen(false);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              onClick={() => createNewSession()}
              className="h-9 px-3 gap-2"
              title="Start new chat"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">New Chat</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                <Activity className="w-12 h-12 text-primary animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Welcome to Pulse
              </h2>
              <p className="text-muted-foreground max-w-md">
                I'm here to help! Ask me anything, share images, or upload files
                for analysis. Let's have a great conversation.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage key={index} {...message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Activity className="w-5 h-5 text-accent-foreground animate-pulse" />
                  </div>
                  <div className="bg-chat-ai rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Positioned higher and closer to bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-4">
        <div className="max-w-4xl mx-auto w-full">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;

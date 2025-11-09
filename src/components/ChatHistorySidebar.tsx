import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChatSession } from "@/types/chat";
import { Menu, Plus, Trash2, MessageSquare, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onCreateNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  onClearAll: () => void;
}

export const ChatHistorySidebar = ({
  sessions,
  currentSessionId,
  onCreateNewChat,
  onSelectChat,
  onDeleteChat,
  onClearAll,
}: ChatHistorySidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return "Today";
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleNewChat = () => {
    onCreateNewChat();
    setIsOpen(false);
  };

  const handleSelectChat = (sessionId: string) => {
    onSelectChat(sessionId);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 hover:bg-accent transition-colors"
          title="Open chat history"
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open chat history</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96 p-0 bg-background/95 backdrop-blur-sm">
        <SheetHeader className="p-6 border-b border-border/50 bg-background/80">
          <SheetTitle className="text-left text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chat History
          </SheetTitle>
          <Button
            onClick={handleNewChat}
            className="w-full mt-4 h-10 font-medium"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          
          {sessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full mt-3 h-9 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/50"
                  variant="outline"
                  size="sm"
                >
                  <Eraser className="h-3.5 w-3.5 mr-2" />
                  Clear All History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Chat History</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete all chat history? This will permanently remove all {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onClearAll();
                      setIsOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </SheetHeader>
        
        {sessions.length > 0 && (
          <div className="px-6 py-2 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Conversations ({sessions.length})
            </p>
          </div>
        )}
        
        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <div className="p-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs leading-relaxed px-4">
                  Start your first chat to see your conversation history here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm",
                      currentSessionId === session.id 
                        ? "bg-primary/5 border-primary/30 shadow-sm" 
                        : "border-border/50 hover:border-border"
                    )}
                    onClick={() => handleSelectChat(session.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 max-w-[240px]">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-3 w-3 text-primary flex-shrink-0" />
                          <p className="font-semibold text-sm truncate text-foreground" title={session.title}>
                            {session.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {formatDate(session.updatedAt)} • {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 ml-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-60 hover:opacity-100 group-hover:opacity-80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                              onClick={(e) => e.stopPropagation()}
                              title="Delete chat"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this chat? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteChat(session.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
import { useState, useCallback, useEffect } from "react";
import { ChatSession, ChatMessage } from "@/types/chat";

const STORAGE_KEY = "pulse_chat_history";

export const useChatHistory = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
          })),
        }));
        setSessions(parsedSessions);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    }
  }, []);

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = useCallback((title?: string): string => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id,
      title: title || `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(id);
    return id;
  }, [sessions.length]);

  const updateSession = useCallback((sessionId: string, messages: ChatMessage[]) => {
    setSessions(prev => {
      const existingSession = prev.find(s => s.id === sessionId);
      
      // Prevent unnecessary updates with more thorough comparison
      if (existingSession && existingSession.messages.length === messages.length) {
        const messagesMatch = existingSession.messages.every((msg, index) => 
          msg.content === messages[index]?.content && 
          msg.role === messages[index]?.role &&
          msg.timestamp?.getTime() === messages[index]?.timestamp?.getTime()
        );
        if (messagesMatch) {
          return prev; // No update needed, return same reference
        }
      }
      
      // Also check if we're just adding the same message multiple times
      if (messages.length > 0 && existingSession) {
        const lastExisting = existingSession.messages[existingSession.messages.length - 1];
        const lastNew = messages[messages.length - 1];
        
        if (lastExisting && lastNew && 
            lastExisting.content === lastNew.content && 
            lastExisting.role === lastNew.role &&
            messages.length === existingSession.messages.length) {
          return prev; // Same messages, no update needed
        }
      }
      
      return prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              messages: messages.map(msg => ({
                ...msg,
                timestamp: msg.timestamp || new Date()
              })),
              updatedAt: new Date(),
              title: session.messages.length === 0 && messages.length > 0 
                ? generateSessionTitle(messages[0].content)
                : session.title
            }
          : session
      );
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  const getCurrentSession = useCallback((): ChatSession | null => {
    return sessions.find(session => session.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  const switchToSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    sessions,
    currentSessionId,
    currentSession: getCurrentSession(),
    createNewSession,
    updateSession,
    deleteSession,
    switchToSession,
    clearAllSessions,
  };
};

const generateSessionTitle = (firstMessage: string): string => {
  // Generate a title from the first message (max 50 chars)
  const cleaned = firstMessage.trim().replace(/\n/g, ' ');
  return cleaned.length > 50 ? cleaned.substring(0, 47) + '...' : cleaned;
};
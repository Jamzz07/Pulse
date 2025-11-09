import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage } from "@/types/chat";
import { getMockResponse, simulateTypingDelay, getMockFileAnalysis } from "@/utils/mockChat";
import { ProcessedFile, generateFileAnalysisPrompt } from "@/utils/fileProcessor";
import { searchDocuments } from "@/lib/vectorUtils";
import { searchDocumentsLocal } from "@/lib/localStorage";

export const useChat = (
  initialMessages: ChatMessage[] = [], 
  onMessagesUpdate?: (messages: ChatMessage[]) => void
) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Update messages when initialMessages change (when switching chats)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Notify parent about messages updates
  useEffect(() => {
    if (onMessagesUpdate) {
      onMessagesUpdate(messages);
    }
  }, [messages, onMessagesUpdate]); // Include onMessagesUpdate but ensure it's memoized in parent

  // Handle mock responses when Supabase is not available
  const handleMockResponse = useCallback(async (userContent: string) => {
    // Add empty assistant message that we'll update
    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);
    
    await simulateTypingDelay(userContent);
    
    let mockResponse = getMockResponse(userContent);
    
    // Try to enhance response with document search if relevant
    try {
      const searchTerms = userContent.toLowerCase();
      if (searchTerms.includes('document') || searchTerms.includes('file') || 
          searchTerms.includes('tell me about') || searchTerms.includes('what') ||
          searchTerms.includes('explain') || searchTerms.includes('analyze')) {
        
        console.log('🔍 Searching documents for:', userContent);
        
        let searchResults: any[] = [];
        
        // Try Pinecone first, fallback to local search
        try {
          searchResults = await searchDocuments(userContent, 3, 'current-user');
          console.log(`📊 Found ${searchResults.length} relevant document sections (Pinecone)`);
        } catch (pineconeError) {
          console.warn('⚠️ Pinecone search failed, trying local search:', pineconeError.message);
          
          const localResults = searchDocumentsLocal(userContent, 'current-user');
          searchResults = localResults.slice(0, 3).map((doc, index) => ({
            score: Math.max(0.9 - index * 0.1, 0.1),
            metadata: {
              fileName: doc.fileName,
              fileType: doc.fileType,
              content: doc.content
            }
          }));
          console.log(`📊 Found ${searchResults.length} relevant document sections (local)`);
        }
        
        if (searchResults.length > 0) {
          const relevantContent = searchResults.map((result, index) => {
            const fileName = result.metadata?.fileName || 'Unknown';
            const content = result.metadata?.content || '';
            const score = ((result.score || 0.5) * 100).toFixed(0);
            
            return `**Document ${index + 1}: ${fileName}** (${score}% relevance)
${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`;
          }).join('\n\n');
          
          mockResponse = `**📚 Found Relevant Information from Your Documents:**

${relevantContent}

**💬 AI Analysis:**
${mockResponse}

**🔍 Search Context:** Found ${searchResults.length} relevant document section${searchResults.length > 1 ? 's' : ''} to help answer your question.`;
        }
      }
    } catch (searchError) {
      console.error('Document search failed from all sources:', searchError);
      // Continue with original response if search fails
    }
    
    // Show complete response immediately to prevent rapid updates
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = {
        role: "assistant",
        content: mockResponse,
        timestamp: new Date(),
      };
      return newMessages;
    });
    
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string, file?: File, processedFile?: ProcessedFile) => {
      console.log('SendMessage called with:', { content, file: file?.name, processedFile });
      if (!content && !file) return;

      let imageUrl: string | undefined;
      let imageData: string | undefined;
      let fileName: string | undefined;

      // Handle file upload
      if (file) {
        fileName = file.name;

        // Convert file to base64 for AI processing
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onloadend = () => {
              imageUrl = reader.result as string;
              imageData = (reader.result as string).split(",")[1];
              resolve(null);
            };
            reader.readAsDataURL(file);
          });
        }
      }

      // Add user message
      const userMessage: ChatMessage = {
        role: "user",
        content: content || "Please analyze this file",
        imageUrl,
        fileName: !file?.type.startsWith("image/") ? fileName : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Check if Supabase is properly configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.warn("Supabase not configured, using mock response");
          const query = content || "Please analyze this file";
          
          if (processedFile) {
            console.log('Using processed file for mock response:', processedFile.name, processedFile.content.length);
            const fileAnalysis = getMockFileAnalysis(
              processedFile.name,
              processedFile.type,
              processedFile.content,
              query
            );
            console.log('Generated file analysis:', fileAnalysis.substring(0, 200) + '...');
            await handleMockResponse(fileAnalysis);
          } else {
            console.log('No processed file, using regular mock response');
            await handleMockResponse(query);
          }
          return;
        }

        const CHAT_URL = `${supabaseUrl}/functions/v1/chat`;

        // Prepare message with image or file content if present
        let messageContent;
        
        if (imageData) {
          messageContent = [
            { type: "text", text: content || "Please analyze this image" },
            {
              type: "image_url",
              image_url: {
                url: `data:${file?.type};base64,${imageData}`,
              },
            },
          ];
        } else if (processedFile) {
          messageContent = generateFileAnalysisPrompt(processedFile, content);
        } else {
          messageContent = content || "Please analyze this file";
        }

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              {
                role: "user",
                content: messageContent,
              },
            ],
          }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to get response");
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";
        let textBuffer = "";
        let streamDone = false;

        // Add empty assistant message that we'll update
        setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantMessage += delta;
                // Update the last message (assistant) with accumulated content
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                    timestamp: new Date(),
                  };
                  return newMessages;
                });
              }
            } catch {
              // Incomplete JSON, put it back
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Chat error:", error);
        console.log("Falling back to mock response due to error");
        
        // Remove the empty assistant message if there was an error
        setMessages((prev) => prev.slice(0, -1));
        
        // Fallback to mock response
        try {
          const query = content || "Please analyze this file";
          
          if (processedFile) {
            const fileAnalysis = getMockFileAnalysis(
              processedFile.name,
              processedFile.type,
              processedFile.content,
              query
            );
            await handleMockResponse(fileAnalysis);
          } else {
            await handleMockResponse(query);
          }
        } catch (mockError) {
          console.error("Mock response failed:", mockError);
          setIsLoading(false);
          
          toast({
            title: "Error",
            description: "Unable to process your message. Please try again.",
            variant: "destructive",
          });
        }
      }
    },
    [messages, toast, handleMockResponse]
  );

  return {
    messages,
    isLoading,
    sendMessage,
  };
};

import { ChatMessage } from "@/types/chat";

// Mock responses for testing when Supabase is not configured
const mockResponses = [
  "Hello! I'm Pulse, your AI companion. How can I help you today?",
  "That's an interesting question! Let me think about that...",
  "I'd be happy to help you with that. Could you provide more details?",
  "Great question! Here's what I think about that topic...",
  "Thanks for sharing that with me. I understand your concern.",
  "I'm here to assist you. What would you like to explore next?",
  "That's a thoughtful approach. Have you considered this angle?",
  "I appreciate you asking. Let me provide some insights on this.",
];

export const getMockResponse = (userMessage: string): string => {
  // Simple response based on message content
  const message = userMessage.toLowerCase();
  
  if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
    return "**Hello!** I'm **Pulse**, your AI companion. It's great to meet you! How can I assist you today?";
  }
  
  if (message.includes("how are you") || message.includes("how's it going")) {
    return "I'm doing **wonderful**, thank you for asking! I'm here and ready to help you with whatever you need. How are you doing today?";
  }
  
  if (message.includes("help") || message.includes("assist")) {
    return "I'm here to **help**! I can assist you with various tasks like:\n\n**• Answering questions**\n**• Providing information**\n**• Analyzing content**\n**• Having friendly conversations**\n\nWhat would you like to explore together?";
  }
  
  if (message.includes("thank") || message.includes("thanks")) {
    return "You're **very welcome**! I'm always happy to help. Is there anything else you'd like to discuss or explore?";
  }
  
  if (message.includes("goodbye") || message.includes("bye") || message.includes("see you")) {
    return "**Goodbye!** It was lovely chatting with you. Feel free to come back anytime you need assistance or just want to talk. Have a **wonderful day**!";
  }
  
  if (message.includes("features") || message.includes("what can you do")) {
    return "I'm **Pulse**, and I can help you with:\n\n**Core Features:**\n• **Smart Conversations** - Natural, engaging dialogue\n• **File Analysis** - Upload and analyze documents/images\n• **Information Assistance** - Answer questions and provide insights\n• **Creative Support** - Help with writing and brainstorming\n\n**Special Capabilities:**\n• **Multi-format Support** - Handle text, images, and documents\n• **Context Awareness** - Remember our conversation history\n• **Personalized Responses** - Adapt to your communication style\n\nWhat would you like to try first?";
  }
  
  // Return a random response with formatting for other messages
  const formattedResponses = [
    "That's an **interesting question**! Let me think about that for you...",
    "I'd be **happy to help** you with that. Could you provide more details?",
    "**Great question!** Here's what I think about that topic...",
    "Thanks for sharing that with me. I **understand** your concern and I'm here to help.",
    "I'm here to **assist you**. What would you like to explore next?",
    "That's a **thoughtful approach**. Have you considered this perspective?",
    "I **appreciate** you asking. Let me provide some insights on this topic.",
  ];
  
  const randomIndex = Math.floor(Math.random() * formattedResponses.length);
  return formattedResponses[randomIndex] + "\n\n*(Note: This is a **mock response** as the AI service is currently being configured)*";
};

export const simulateTypingDelay = (text: string): Promise<void> => {
  // Simulate typing delay based on text length (50-100ms per character)
  const delay = Math.min(Math.max(text.length * 30, 500), 2000);
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Mock file analysis based on file type and content
export const getMockFileAnalysis = (fileName: string, fileType: string, fileContent: string, userQuery: string): string => {
  const fileExt = fileName.split('.').pop()?.toLowerCase();
  
  // If the content is already processed PDF or Word content, use it directly
  if (fileContent.includes('**PDF Document Analysis:**') || fileContent.includes('**Word Document Analysis:**')) {
    return `${fileContent}

**Your Query:** "${userQuery}"

**My Analysis:**
Based on the extracted content above and your specific request, I can help you with detailed analysis, summarization, key point extraction, or answer specific questions about this document. The text has been successfully extracted and is ready for comprehensive examination.

What specific aspects of this document would you like me to focus on?`;
  }
  
  if (fileExt === 'txt' || fileType.includes('text')) {
    return `**Text File Analysis: ${fileName}**

I've successfully read and analyzed your text file. Here's what I found:

**File Overview:**
• **Filename:** ${fileName}
• **Type:** Text Document
• **Content Length:** ${fileContent.length} characters
• **Word Count:** ~${fileContent.split(/\s+/).filter(word => word.length > 0).length} words

**Content Analysis:**
${fileContent.length > 500 ? 
  `The document contains substantial text content. Here's a preview of the beginning:\n\n"${fileContent.substring(0, 200)}..."\n\n**Key Observations:**\n• The document appears to be ${fileContent.includes('\n\n') ? 'well-structured with paragraphs' : 'continuous text'}\n• ${fileContent.match(/[.!?]/g)?.length || 0} sentences detected` :
  `**Full Content:**\n"${fileContent}"\n\n**Analysis:**\n• This is a ${fileContent.length < 100 ? 'short' : 'medium-length'} text document\n• Contains ${fileContent.match(/[.!?]/g)?.length || 0} sentences`
}

**Your Request:** ${userQuery}

Based on your request and the file content, I can help you with analysis, summarization, editing suggestions, or answer specific questions about this text. What would you like me to focus on?`;
  }
  
  if (fileExt === 'json') {
    try {
      const jsonData = JSON.parse(fileContent);
      return `**JSON File Analysis: ${fileName}**

I've successfully parsed and analyzed your JSON file:

**File Structure:**
• **Filename:** ${fileName}
• **Type:** JSON Data
• **Valid JSON:** ✅ Yes
• **Size:** ${Object.keys(jsonData).length} top-level properties

**Content Overview:**
${JSON.stringify(jsonData, null, 2).substring(0, 300)}${JSON.stringify(jsonData, null, 2).length > 300 ? '...' : ''}

**Data Analysis:**
• **Data Type:** ${Array.isArray(jsonData) ? 'Array' : 'Object'}
• **Complexity:** ${JSON.stringify(jsonData).length > 1000 ? 'Complex structure' : 'Simple structure'}
• **Contains:** ${typeof jsonData === 'object' ? Object.keys(jsonData).join(', ') : 'Array data'}

**Your Request:** ${userQuery}

I can help you analyze this data structure, extract specific information, validate the format, or convert it to other formats. What specific analysis would you like me to perform?`;
    } catch (e) {
      return `**JSON File Analysis: ${fileName}**

I've analyzed your JSON file and found some issues:

**File Status:** ❌ Invalid JSON format
**Error:** The file contains malformed JSON data

**Raw Content Preview:**
${fileContent.substring(0, 200)}...

**Your Request:** ${userQuery}

I can help you fix the JSON syntax errors or analyze the content as plain text instead. Would you like me to identify the formatting issues?`;
    }
  }
  
  if (fileExt === 'csv') {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',') || [];
    return `**CSV File Analysis: ${fileName}**

I've successfully parsed your CSV file:

**Dataset Overview:**
• **Filename:** ${fileName}
• **Type:** CSV (Comma-Separated Values)
• **Rows:** ${lines.length} ${lines.length > 1 ? `(${lines.length - 1} data rows + header)` : ''}
• **Columns:** ${headers.length}

**Column Headers:**
${headers.map((header, i) => `${i + 1}. ${header.trim()}`).join('\n')}

**Data Preview (First 3 rows):**
${lines.slice(0, Math.min(4, lines.length)).join('\n')}

**Your Request:** ${userQuery}

I can help you analyze this data, calculate statistics, filter information, find patterns, or answer questions about specific columns or rows. What analysis would you like me to perform?`;
  }
  
  if (fileExt === 'md') {
    return `**Markdown File Analysis: ${fileName}**

I've successfully read and analyzed your Markdown document:

**Document Overview:**
• **Filename:** ${fileName}
• **Type:** Markdown Document
• **Content Length:** ${fileContent.length} characters
• **Structure:** ${fileContent.includes('#') ? 'Contains headers/sections' : 'Plain text with markdown formatting'}

**Content Analysis:**
${fileContent.includes('#') ? 
  `**Headers Found:**\n${fileContent.match(/^#+\s+.+$/gm)?.slice(0, 5).join('\n') || 'None'}\n\n` : 
  ''
}**Formatting Elements:**
• **Bold text:** ${(fileContent.match(/\*\*(.*?)\*\*/g) || []).length} instances
• **Links:** ${(fileContent.match(/\[.*?\]\(.*?\)/g) || []).length} links
• **Lists:** ${fileContent.includes('- ') || fileContent.includes('* ') ? 'Present' : 'None'}

**Content Preview:**
${fileContent.substring(0, 300)}${fileContent.length > 300 ? '...' : ''}

**Your Request:** ${userQuery}

I can help you analyze the document structure, convert to other formats, extract specific sections, or answer questions about the content. What would you like me to focus on?`;
  }
  
  // Default response for other file types
  return `**File Analysis: ${fileName}**

I've processed your file and here's what I can tell you:

**File Information:**
• **Filename:** ${fileName}
• **Type:** ${fileType || 'Unknown type'}
• **Status:** File uploaded successfully

**Content Summary:**
${fileContent.length > 100 ? 
  `The file contains ${fileContent.length} characters of content. Based on the file type and your request, I can provide analysis and assistance.` :
  `File content: "${fileContent}"`
}

**Your Request:** ${userQuery}

While I may not be able to fully parse this specific file type, I can help you with:
• General file information and metadata
• Guidance on how to process this file type
• Suggestions for tools or methods to extract the content
• Analysis based on any readable portions

What specific help do you need with this file?`;
};
// Simple text formatter that converts markdown-like syntax to styled text
export const formatText = (text: string): string => {
  if (!text) return '';
  
  // Remove markdown bold formatting and keep the content
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove ** markers
    .replace(/__(.*?)__/g, '$1')      // Remove __ markers  
    .replace(/\*(.*?)\*/g, '$1')      // Remove * markers
    .replace(/_(.*?)_/g, '$1')        // Remove _ markers
    .replace(/`(.*?)`/g, '$1')        // Remove ` markers
    .replace(/~~(.*?)~~/g, '$1');     // Remove ~~ markers
};

// Parse text and return segments with formatting info
export interface TextSegment {
  content: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
}

export const parseTextSegments = (text: string): TextSegment[] => {
  if (!text) return [];
  
  const segments: TextSegment[] = [];
  let currentIndex = 0;
  
  // Define all formatting patterns
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, type: 'bold' },
    { regex: /\*(.*?)\*/g, type: 'italic' },
    { regex: /__(.*?)__/g, type: 'bold' },
    { regex: /_(.*?)_/g, type: 'italic' },
    { regex: /`(.*?)`/g, type: 'code' },
    { regex: /~~(.*?)~~/g, type: 'strikethrough' }
  ];
  
  // Find all formatting matches
  const matches = [];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      // Check for overlaps with existing matches
      const hasOverlap = matches.some(existing => 
        (match.index < existing.end && match.index + match[0].length > existing.start)
      );
      
      if (!hasOverlap) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
          type: pattern.type
        });
      }
    }
  });
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);
  
  // Build segments
  matches.forEach(matchInfo => {
    // Add text before match
    if (matchInfo.start > currentIndex) {
      const beforeText = text.slice(currentIndex, matchInfo.start);
      if (beforeText) {
        segments.push({ content: beforeText });
      }
    }
    
    // Add formatted segment
    const segmentProps: TextSegment = { content: matchInfo.content };
    
    switch (matchInfo.type) {
      case 'bold':
        segmentProps.bold = true;
        break;
      case 'italic':
        segmentProps.italic = true;
        break;
      case 'code':
        segmentProps.code = true;
        break;
      case 'strikethrough':
        segmentProps.strikethrough = true;
        break;
    }
    
    segments.push(segmentProps);
    currentIndex = matchInfo.end;
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      segments.push({ content: remainingText });
    }
  }
  
  return segments.length > 0 ? segments : [{ content: text }];
};

// Simple list formatter for bullet points
export const formatLists = (text: string): string => {
  // Convert markdown lists to proper format
  return text
    .replace(/^\s*[-*+]\s+(.+)$/gm, '• $1')  // Convert - * + to bullet points
    .replace(/^\s*\d+\.\s+(.+)$/gm, (match, content, offset, string) => {
      const lineNumber = (string.slice(0, offset).match(/^\s*\d+\./gm) || []).length;
      return `${lineNumber}. ${content}`;
    });
};
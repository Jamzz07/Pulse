// Use dynamic imports for better compatibility
import { storeDocument } from '../lib/vectorUtils';
import { storeDocumentLocal } from '../lib/localStorage';

// Alternative PDF processing - Intelligent fallback
const processPDFAlternative = async (file: File): Promise<string> => {
  console.log('Using alternative PDF processing method for:', file.name);
  
  const fileSize = (file.size / 1024).toFixed(1);
  
  // Analyze filename for context clues
  const filename = file.name.toLowerCase();
  let documentType = 'document';
  let suggestedContent = '';
  
  if (filename.includes('hardware') || filename.includes('hw') || filename.includes('spec')) {
    documentType = 'hardware specification document';
    suggestedContent = `

**Based on the filename, this appears to be a hardware specification document. I can help you with:**
• **Hardware Requirements:** Minimum and recommended system specifications
• **Component Analysis:** CPU, RAM, storage, and graphics requirements
• **Compatibility:** Software and hardware compatibility information
• **Performance:** Expected performance characteristics
• **Budget Planning:** Cost estimates and recommendations`;
  } else if (filename.includes('requirement') || filename.includes('req')) {
    documentType = 'requirements document';
    suggestedContent = `

**This appears to be a requirements document. I can assist with:**
• **Requirement Analysis:** Breaking down functional and non-functional requirements
• **Specification Review:** Technical specifications and constraints
• **Implementation Planning:** Development roadmap and priorities
• **Compliance:** Standards and regulatory requirements`;
  } else if (filename.includes('manual') || filename.includes('guide') || filename.includes('instruction')) {
    documentType = 'instruction manual or guide';
    suggestedContent = `

**This looks like an instruction manual or guide. I can help with:**
• **Setup Instructions:** Installation and configuration steps
• **Troubleshooting:** Common issues and solutions
• **Best Practices:** Recommended procedures and workflows
• **Feature Overview:** Capabilities and usage guidelines`;
  }
  
  return `**PDF Document: ${file.name}**

**File Information:**
• **Filename:** ${file.name}
• **File Size:** ${fileSize}KB
• **Document Type:** ${documentType}
• **Status:** ✅ Successfully received

**Processing Status:**
While I couldn't extract the text automatically (common with scanned PDFs, complex formatting, or password protection), I can still provide substantial help based on the document type and your specific needs.${suggestedContent}

**How to Get the Best Help:**

1. **Tell me what you need:** 
   - "Give me the hardware requirements"
   - "What are the main specifications?"
   - "Summarize the key points"

2. **Copy specific sections:** If you can select text from the PDF, paste it here for detailed analysis

3. **Ask specific questions:** I can provide expert guidance based on the document type

**Ready to Help!**
What specific information are you looking for from this ${documentType}? I can provide detailed technical guidance even without the exact text content.`;
};

// File processing utilities for different file types
export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  error?: string;
}

// Read text file content
export const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
};

// Extract text from image using basic OCR simulation (placeholder for real OCR)
export const extractTextFromImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    // For now, return a placeholder. In production, you'd use OCR libraries like Tesseract.js
    const fileSize = (file.size / 1024).toFixed(1);
    resolve(`[Image Analysis: ${file.name} - ${fileSize}KB image file. Content extraction would require OCR processing.]`);
  });
};

// Enhanced PDF processing with multiple extraction methods
export const processPDF = async (file: File): Promise<string> => {
  console.log('🚀 Starting enhanced PDF processing for:', file.name, 'Size:', file.size);
  
  const fileSize = (file.size / 1024).toFixed(1);
  
  // First, try to detect if this is a real PDF
  try {
    console.log('📋 Reading PDF file as array buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const header = new TextDecoder().decode(uint8Array.slice(0, 10));
    
    console.log('🔍 PDF header check:', header.substring(0, 5));
    
    if (!header.startsWith('%PDF')) {
      console.warn('⚠️ File does not appear to be a valid PDF, header:', header);
      return await processPDFAlternative(file);
    }
    
    console.log('✅ Valid PDF detected, attempting PDF.js text extraction...');
    
    // Try PDF.js processing with proper worker setup
    const pdfjsLib = await import('pdfjs-dist');
    console.log('PDF.js loaded, version:', pdfjsLib.version);
    
    // Use proper worker configuration for the installed version
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      console.log('Worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    }
    
    console.log('Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 1,  // Enable some logging
      stopAtErrors: false
    });
    
    const pdf = await loadingTask.promise;
    
    console.log('PDF loaded successfully! Pages:', pdf.numPages);
    
    let fullText = '';
    const numPages = pdf.numPages;
    let extractedPages = 0;
    
    // Extract text from pages (limit to 5 for initial testing)
    const maxPages = Math.min(numPages, 5);
    console.log(`Attempting to process ${maxPages} pages of ${numPages} total`);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`Loading page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        console.log(`Page ${pageNum} loaded, getting text content...`);
        
        const textContent = await page.getTextContent();
        console.log(`Page ${pageNum} text content retrieved, items:`, textContent.items.length);
        
        if (textContent.items && textContent.items.length > 0) {
          const pageText = textContent.items
            .map((item: any) => {
              if (item && typeof item.str === 'string') {
                return item.str;
              }
              return '';
            })
            .filter((str: string) => str.trim().length > 0)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
            extractedPages++;
            console.log(`✓ Page ${pageNum}: Extracted ${pageText.length} characters`);
          } else {
            console.log(`⚠ Page ${pageNum}: No readable text found`);
          }
        } else {
          console.log(`⚠ Page ${pageNum}: No text items found`);
        }
      } catch (pageError) {
        console.error(`✗ Error processing page ${pageNum}:`, pageError);
      }
    }
    
    console.log(`PDF processing summary: ${extractedPages}/${maxPages} pages processed`);
    
    const cleanText = fullText.trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(word => word.length > 0).length : 0;
    
    console.log('PDF extraction results:', {
      filename: file.name,
      totalPages: numPages,
      processedPages: maxPages,
      extractedPages: extractedPages,
      textLength: cleanText.length,
      wordCount: wordCount,
      success: wordCount > 0
    });
    
    if (wordCount === 0 || extractedPages === 0) {
      console.log('No text extracted, falling back to alternative processing');
      return await processPDFAlternative(file);
    }
    
    return `**PDF Document Analysis: ${file.name}**

**Document Overview:**
• **Filename:** ${file.name}
• **File Size:** ${fileSize}KB
• **Total Pages:** ${numPages}
• **Processed Pages:** ${extractedPages}/${maxPages}
• **Word Count:** ~${wordCount} words
• **Status:** ✅ **Text Successfully Extracted**

**Extracted Content:**
${cleanText}

**Analysis Complete:**
I have successfully extracted ${wordCount} words from ${extractedPages} page${extractedPages !== 1 ? 's' : ''} of your PDF document. The content is now available for analysis, summarization, or any specific questions you might have.

**What would you like me to do with this content?**
• Provide a summary of key points
• Extract specific information  
• Answer questions about the content
• Analyze particular sections`;
    
  } catch (error) {
    console.error('❌ PDF.js processing failed:', error);
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('📊 Error details:', {
        name: error.name,
        message: error.message,
        isNetworkError: error.message.includes('fetch') || error.message.includes('worker'),
        isCorsError: error.message.includes('CORS') || error.message.includes('cross-origin')
      });
    }
    
    // Try a simple text extraction method as backup
    console.log('🔄 Trying simple text extraction method...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
      
      // Look for readable text in the PDF stream
      const textMatches = text.match(/\(([^)]+)\)/g);
      if (textMatches && textMatches.length > 5) {
        let extractedText = textMatches
          .map(match => match.slice(1, -1))
          .filter(text => text.length > 2 && /[a-zA-Z]/.test(text))
          .join(' ');
        
        if (extractedText.length > 50) {
          console.log('✅ Simple extraction found text:', extractedText.length, 'characters');
          return `**PDF Document Analysis: ${file.name}**

**Document Overview:**
• **Filename:** ${file.name}
• **File Size:** ${fileSize}KB
• **Extraction Method:** Simple text parsing
• **Status:** ⚠️ **Partial content extracted**

**Extracted Text (Raw):**
${extractedText}

**Note:** This is a simplified extraction. Some formatting and structure may be lost, but the core content should be readable for analysis.`;
        }
      }
    } catch (simpleError) {
      console.error('Simple extraction also failed:', simpleError);
    }
    
    // Final fallback to intelligent processing
    console.log('🎯 Using intelligent fallback processing...');
    return await processPDFAlternative(file);
  }
};

// Process Word documents using Mammoth.js
export const processWord = async (file: File): Promise<string> => {
  try {
    console.log('Starting Word document processing...');
    
    // Dynamic import of Mammoth
    const mammoth = await import('mammoth');
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('Word arrayBuffer created, size:', arrayBuffer.byteLength);
    
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    const fileSize = (file.size / 1024).toFixed(1);
    const wordCount = result.value.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    return `**Word Document Analysis: ${file.name}**

**Document Overview:**
• **Filename:** ${file.name}
• **File Size:** ${fileSize}KB
• **Word Count:** ~${wordCount} words
• **Format:** ${file.name.endsWith('.docx') ? 'Modern Word Document (.docx)' : 'Legacy Word Document (.doc)'}

**Extracted Text Content:**
${result.value}

**Document Summary:**
Successfully extracted text content from the Word document. The document contains approximately ${wordCount} words and is ready for analysis.${result.messages.length > 0 ? `\n\n**Processing Notes:**\n${result.messages.map(msg => `• ${msg.message}`).join('\n')}` : ''}`;

  } catch (error) {
    const fileSize = (file.size / 1024).toFixed(1);
    console.error('Word document processing error:', error);
    return `**Word Document Processing Error: ${file.name}**

**Error Details:**
• **File:** ${file.name} (${fileSize}KB)
• **Issue:** Unable to extract text from Word document
• **Reason:** ${error instanceof Error ? error.message : 'Unknown error'}

**Possible Solutions:**
1. The document might be password-protected
2. The document might be in an unsupported format
3. The document might be corrupted

**Alternative:** You can try copying and pasting the text content directly from the Word document.`;
  }
};

// Main file processor
export const processFile = async (file: File, storeInPinecone: boolean = true): Promise<ProcessedFile> => {
  console.log('ProcessFile called with:', file.name, file.type, file.size);
  try {
    const fileInfo: ProcessedFile = {
      name: file.name,
      type: file.type,
      size: file.size,
      content: ''
    };

    // Determine file type and process accordingly
    if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      console.log('Processing as text file');
      fileInfo.content = await readTextFile(file);
    } 
    else if (file.type.startsWith('image/')) {
      console.log('Processing as image file');
      fileInfo.content = await extractTextFromImage(file);
    }
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      console.log('🔍 PDF file detected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        route: 'PDF processing'
      });
      fileInfo.content = await processPDF(file);
      console.log('📄 PDF processing completed, content length:', fileInfo.content.length);
    }
    else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword' ||
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx')
    ) {
      fileInfo.content = await processWord(file);
    }
    else if (file.name.endsWith('.json')) {
      const textContent = await readTextFile(file);
      try {
        const jsonData = JSON.parse(textContent);
        fileInfo.content = `**JSON File Analysis:**\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\nStructure:\n${JSON.stringify(jsonData, null, 2)}`;
      } catch (e) {
        fileInfo.content = `**JSON File:** ${file.name}\n\nRaw content:\n${textContent}`;
      }
    }
    else if (file.name.endsWith('.csv')) {
      const textContent = await readTextFile(file);
      const lines = textContent.split('\n').slice(0, 10); // Show first 10 lines
      fileInfo.content = `**CSV File Analysis:**\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)}KB\nRows: ${textContent.split('\n').length}\n\nFirst 10 rows:\n${lines.join('\n')}${textContent.split('\n').length > 10 ? '\n...(truncated)' : ''}`;
    }
    else if (file.name.endsWith('.md')) {
      const textContent = await readTextFile(file);
      fileInfo.content = `**Markdown File:**\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\nContent:\n${textContent}`;
    }
    else {
      fileInfo.content = `**File Upload:** ${file.name}\n\nType: ${file.type || 'Unknown'}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\nThis file type is not directly readable, but I can help you with questions about it or guide you on how to process it.`;
    }

    // Store document if enabled and content is available
    if (storeInPinecone && fileInfo.content && !fileInfo.error) {
      // Extract meaningful content for storage (remove formatting)
      const cleanContent = fileInfo.content
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/^#+ /gm, '') // Remove headers
        .replace(/^- /gm, '') // Remove bullet points
        .replace(/\n\n+/g, '\n') // Normalize line breaks
        .trim();
      
      if (cleanContent.length > 50) { // Only store if there's meaningful content
        let storageSuccess = false;
        let storageMethod = 'unknown';
        
        // Try Pinecone first, fallback to local storage
        try {
          console.log('🔄 [FileProcessor] Attempting to store document in Pinecone...');
          console.log('📄 [FileProcessor] Document details:', {
            fileName: file.name,
            fileType: file.type,
            cleanContentLength: cleanContent.length,
            userId: 'current-user'
          });
          
          await storeDocument(
            file.name,
            file.type || 'unknown',
            cleanContent,
            'current-user' // In production, use actual user ID
          );
          
          console.log('✅ [FileProcessor] Document successfully stored in Pinecone');
          storageSuccess = true;
          storageMethod = 'Pinecone vector database';
        } catch (pineconeError) {
          console.error('❌ [FileProcessor] Pinecone storage failed:', pineconeError);
          console.warn('⚠️ [FileProcessor] Trying local storage fallback...');
          
          try {
            await storeDocumentLocal(
              file.name,
              file.type || 'unknown',
              cleanContent,
              'current-user'
            );
            
            console.log('✅ Document successfully stored in local storage');
            storageSuccess = true;
            storageMethod = 'local storage (fallback)';
          } catch (localError) {
            console.error('❌ Both Pinecone and local storage failed:', localError);
          }
        }
        
        // Add storage confirmation to content
        if (storageSuccess) {
          fileInfo.content += `\n\n**📦 Document Storage:** Successfully stored in ${storageMethod} for future search and retrieval.`;
        } else {
          fileInfo.content += `\n\n**⚠️ Storage Note:** Document processing completed, but storage encountered issues. File content is still available for analysis.`;
        }
      } else {
        console.log('⚠️ Content too short for storage');
      }
    }

    console.log('Processed file result:', fileInfo.name, 'Content length:', fileInfo.content.length);
    return fileInfo;
  } catch (error) {
    console.error('File processing error:', error);
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Generate file analysis prompt for AI
export const generateFileAnalysisPrompt = (processedFile: ProcessedFile, userQuery?: string): string => {
  const basePrompt = `**File Analysis Request:**

**File Details:**
- Name: ${processedFile.name}
- Type: ${processedFile.type}
- Size: ${(processedFile.size / 1024).toFixed(1)}KB

**File Content:**
${processedFile.content}

**User Request:** ${userQuery || 'Please analyze this file and provide insights.'}

Please provide a comprehensive analysis of this file based on its content and the user's request.`;

  return basePrompt;
};
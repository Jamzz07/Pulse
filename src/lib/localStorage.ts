// Local storage-based document management for development
export interface LocalDocument {
  id: string;
  fileName: string;
  fileType: string;
  content: string;
  timestamp: string;
  userId?: string;
}

const STORAGE_KEY = 'pulse-documents';

// Store document locally
export const storeDocumentLocal = async (
  fileName: string,
  fileType: string,
  content: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('📦 Storing document locally:', fileName);
    
    const document: LocalDocument = {
      id: `${fileName}_${Date.now()}`,
      fileName,
      fileType,
      content,
      timestamp: new Date().toISOString(),
      userId: userId || 'current-user'
    };
    
    // Get existing documents
    const existing = getStoredDocuments();
    
    // Add new document
    const updated = [...existing, document];
    
    // Store back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    console.log('✅ Document stored locally successfully');
  } catch (error) {
    console.error('❌ Error storing document locally:', error);
    throw error;
  }
};

// Get all stored documents
export const getStoredDocuments = (): LocalDocument[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading stored documents:', error);
    return [];
  }
};

// Search documents by content
export const searchDocumentsLocal = (query: string, userId?: string): LocalDocument[] => {
  try {
    const documents = getStoredDocuments();
    const filteredDocs = userId ? documents.filter(doc => doc.userId === userId) : documents;
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    return filteredDocs.filter(doc => {
      const searchText = `${doc.fileName} ${doc.content}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    }).sort((a, b) => {
      // Simple relevance scoring based on term matches
      const aMatches = searchTerms.filter(term => 
        `${a.fileName} ${a.content}`.toLowerCase().includes(term)
      ).length;
      const bMatches = searchTerms.filter(term => 
        `${b.fileName} ${b.content}`.toLowerCase().includes(term)
      ).length;
      return bMatches - aMatches;
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
};

// Get documents for a specific user
export const getUserDocumentsLocal = (userId?: string): LocalDocument[] => {
  try {
    const documents = getStoredDocuments();
    return userId ? documents.filter(doc => doc.userId === userId) : documents;
  } catch (error) {
    console.error('Error getting user documents:', error);
    return [];
  }
};

// Clear all documents
export const clearAllDocuments = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ All documents cleared from local storage');
};

export default {
  storeDocumentLocal,
  getStoredDocuments,
  searchDocumentsLocal,
  getUserDocumentsLocal,
  clearAllDocuments
};
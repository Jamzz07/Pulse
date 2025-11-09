import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { FileText, Search, Database, Calendar, FileIcon, Trash2 } from 'lucide-react';
import { getUserDocuments, searchDocuments, clearAllStoredDocuments } from '../lib/vectorUtils';
import { getUserDocumentsLocal, searchDocumentsLocal } from '../lib/localStorage';
import { Input } from './ui/input';

interface StoredDocument {
  fileName: string;
  fileType: string;
  timestamp: string;
  score?: number;
}

interface DocumentManagerProps {
  onDocumentSelect?: (fileName: string) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ onDocumentSelect }) => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [storageMethod, setStorageMethod] = useState<'pinecone' | 'local' | 'unknown'>('unknown');
  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Load user documents on component mount
  useEffect(() => {
    loadUserDocuments();
  }, []);

  // Add periodic refresh to check for new documents
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing documents...');
      loadUserDocuments();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadUserDocuments = async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      console.log('📄 [DocumentManager] Loading user documents...');
      
      // Try Pinecone first, fallback to local storage
      let userDocs: any[] = [];
      let usedPinecone = false;
      
      try {
        console.log('🔄 [DocumentManager] Attempting Pinecone connection...');
        
        // Check environment first
        const apiKey = import.meta.env.VITE_PINECONE_API_KEY;
        const indexName = import.meta.env.VITE_PINECONE_INDEX_NAME;
        
        console.log('🔑 [DocumentManager] Environment check:', {
          hasApiKey: !!apiKey,
          hasIndexName: !!indexName
        });
        
        if (!apiKey || !indexName) {
          throw new Error('Missing Pinecone environment variables');
        }
        
        userDocs = await getUserDocuments('current-user');
        console.log('✅ [DocumentManager] Loaded from Pinecone:', userDocs.length, 'documents');
        setStorageMethod('pinecone');
        usedPinecone = true;
      } catch (pineconeError) {
        console.warn('⚠️ [DocumentManager] Pinecone failed, trying local storage:', pineconeError.message);
        setLastError(`Pinecone error: ${pineconeError.message}`);
        
        try {
          const localDocs = getUserDocumentsLocal('current-user');
          // Convert local docs to match the expected format
          userDocs = localDocs.map(doc => ({
            fileName: doc.fileName,
            fileType: doc.fileType,
            timestamp: doc.timestamp,
            score: 1.0
          }));
          console.log('✅ [DocumentManager] Loaded from local storage:', userDocs.length, 'documents');
          setStorageMethod('local');
        } catch (localError) {
          console.error('❌ [DocumentManager] Local storage also failed:', localError);
          setLastError(`Both storages failed. Pinecone: ${pineconeError.message}, Local: ${localError.message}`);
          throw localError;
        }
      }
      
      setDocuments(userDocs);
      
      if (usedPinecone && userDocs.length === 0) {
        console.log('⚠️ [DocumentManager] Pinecone connected but returned 0 documents - may need to upload files first');
      }
      
    } catch (error) {
      console.error('❌ [DocumentManager] Failed to load documents from all sources:', error);
      setDocuments([]);
      setLastError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('🔍 Searching for:', searchQuery);
      
      // Try Pinecone first, fallback to local search
      let results: any[] = [];
      
      try {
        console.log('🔄 Trying Pinecone search...');
        results = await searchDocuments(searchQuery, 10, 'current-user');
        console.log('✅ Pinecone search results:', results.length);
      } catch (pineconeError) {
        console.warn('⚠️ Pinecone search failed, trying local search:', pineconeError.message);
        
        const localResults = searchDocumentsLocal(searchQuery, 'current-user');
        // Convert local results to match expected format
        results = localResults.slice(0, 10).map((doc, index) => ({
          score: Math.max(0.9 - index * 0.1, 0.1), // Simulate relevance scoring
          metadata: {
            fileName: doc.fileName,
            fileType: doc.fileType,
            content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
            timestamp: doc.timestamp
          }
        }));
        console.log('✅ Local search results:', results.length);
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed from all sources:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📃';
    if (fileType.includes('image')) return '🖼️';
    return '📁';
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('document')) return 'Word';
    if (fileType.includes('text')) return 'Text';
    if (fileType.includes('image')) return 'Image';
    return 'File';
  };

  const handleClearAllDocuments = async () => {
    setIsClearing(true);
    setLastError(null);
    setShowClearDialog(false);
    
    try {
      console.log('🗑️ Starting to clear all documents...');
      await clearAllStoredDocuments('current-user');
      
      // Refresh the document list
      await loadUserDocuments();
      setSearchResults([]);
      setSearchQuery('');
      
      console.log('✅ All documents cleared successfully!');
    } catch (error) {
      console.error('❌ Error clearing documents:', error);
      setLastError(`Failed to clear all documents: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Document Storage</CardTitle>
        </div>
        <CardDescription>
          Manage your uploaded documents and search through them
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Section */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search documents by content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Found {searchResults.length} matching document sections
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <ScrollArea className="h-48 border rounded-md p-2">
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onDocumentSelect?.(result.metadata?.fileName)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {getFileIcon(result.metadata?.fileType || '')} {result.metadata?.fileName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {(result.score * 100).toFixed(0)}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {result.metadata?.content?.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Documents List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Documents ({documents.length})</span>
            </h4>
            <div className="flex gap-2">
              <Button
                onClick={loadUserDocuments}
                disabled={isLoading || isClearing}
                variant="ghost"
                size="sm"
              >
                Refresh
              </Button>
              <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading || isClearing || documents.length === 0}
                    variant="destructive"
                    size="sm"
                    className="px-3 gap-1"
                    title={isClearing ? 'Clearing all documents...' : 'Clear all documents'}
                  >
                    <Trash2 className="h-3 w-3" />
                    {isClearing ? 'Clearing...' : 'Clear All'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Documents?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all uploaded files from both Pinecone vector database and local storage. 
                      <br /><br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllDocuments}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All Documents
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents stored yet</p>
              <p className="text-xs">Upload a file to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onDocumentSelect?.(doc.fileName)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                          <span className="text-sm font-medium truncate">
                            {doc.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getFileTypeLabel(doc.fileType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatTimestamp(doc.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs text-red-700">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-semibold">⚠️ Storage Issue</span>
              </div>
              <p>{lastError}</p>
            </div>
          </div>
        )}

        {/* Storage Info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Database className="h-3 w-3" />
              <strong>
                Storage: {storageMethod === 'pinecone' ? '✅ Pinecone Vector DB' : 
                         storageMethod === 'local' ? '💾 Local Storage (Fallback)' : 
                         '❓ Checking...'}
              </strong>
            </div>
            <p>
              {storageMethod === 'pinecone' 
                ? 'Documents stored in Pinecone vector database for semantic search.'
                : storageMethod === 'local'
                ? 'Using local browser storage as fallback. Upload files to test Pinecone connection.'
                : 'Checking storage availability...'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentManager;
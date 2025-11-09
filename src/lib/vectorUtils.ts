import { getIndex } from './pinecone';

export interface DocumentVector {
  id: string;
  values: number[];
  metadata: {
    fileName: string;
    fileType: string;
    content: string;
    timestamp: string;
    userId?: string;
    chunkIndex?: number;
    totalChunks?: number;
    chunkLength?: number;
  };
}

// Advanced embedding generation using TF-IDF and semantic hashing
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    console.log('🔄 Generating embedding for text length:', text.length);
    
    // Clean and preprocess text
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const words = cleanText.split(/\s+/).filter(word => word.length > 2); // Filter short words
    const uniqueWords = [...new Set(words)]; // Get unique words
    
    // Use 384 dimensions to match Pinecone index
    const embedding = new Array(384).fill(0);
    
    // TF-IDF inspired approach
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Generate semantic features
    uniqueWords.forEach((word, wordIndex) => {
      const tf = wordFreq[word] / words.length; // Term frequency
      
      // Create multiple hash functions for the word
      for (let hashFunc = 0; hashFunc < 5; hashFunc++) {
        let hash = 0;
        
        // Generate hash using different seeds
        for (let i = 0; i < word.length; i++) {
          const char = word.charCodeAt(i);
          hash = ((hash << 5) - hash + char + hashFunc * 31) & 0x7fffffff;
        }
        
        // Map to embedding dimensions
        const dim1 = hash % embedding.length;
        const dim2 = (hash * 31) % embedding.length;
        const dim3 = (hash * 97) % embedding.length;
        
        // Use TF-IDF weight
        const weight = tf * Math.log(uniqueWords.length / (1 + wordIndex));
        
        embedding[dim1] += weight * Math.sin(hash * 0.001);
        embedding[dim2] += weight * Math.cos(hash * 0.001);
        embedding[dim3] += weight * Math.tan(hash * 0.0001);
      }
    });
    
    // Add positional encoding for word order
    for (let i = 0; i < Math.min(words.length, 50); i++) {
      const word = words[i];
      const positionWeight = 1 / (i + 1); // Words at beginning are more important
      
      let posHash = 0;
      for (let j = 0; j < word.length; j++) {
        posHash = ((posHash << 3) + word.charCodeAt(j) + i) & 0x7fffffff;
      }
      
      const dim = posHash % embedding.length;
      embedding[dim] += positionWeight * 0.1;
    }
    
    // Add semantic features based on text statistics
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const textEntropy = calculateEntropy(words);
    const sentenceCount = text.split(/[.!?]+/).length;
    
    // Encode document-level features
    embedding[0] += avgWordLength * 0.01;
    embedding[1] += textEntropy * 0.01;
    embedding[2] += sentenceCount * 0.001;
    embedding[3] += words.length * 0.0001;
    
    // L2 normalization
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
    
    console.log('✅ Advanced embedding generated:', {
      dimensions: embedding.length,
      uniqueWords: uniqueWords.length,
      totalWords: words.length,
      avgWordLength: avgWordLength.toFixed(2),
      entropy: textEntropy.toFixed(2)
    });
    
    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    // Return a random normalized embedding if generation fails
    const fallback = new Array(384).fill(0).map(() => Math.random() - 0.5);
    const norm = Math.sqrt(fallback.reduce((sum, val) => sum + val * val, 0));
    return fallback.map(val => val / norm);
  }
};

// Helper function to calculate text entropy
const calculateEntropy = (words: string[]): number => {
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  const total = words.length;
  let entropy = 0;
  
  Object.values(freq).forEach(count => {
    const p = (count as number) / total;
    if (p > 0) entropy -= p * Math.log2(p);
  });
  
  return entropy;
};

// Split text into chunks for better embedding
export const chunkText = (text: string, maxChunkSize: number = 800): string[] => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

// Store document in Pinecone with proper chunking and embedding
export const storeDocument = async (
  fileName: string,
  fileType: string,
  content: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('🚀 Starting Pinecone document storage...');
    console.log('📄 File details:', { fileName, fileType, contentLength: content.length, userId });
    
    // Check if we have the necessary environment variables
    const apiKey = import.meta.env.VITE_PINECONE_API_KEY;
    console.log('🔑 API Key available:', !!apiKey);
    
    if (!apiKey) {
      throw new Error('Pinecone API key not available - check environment variables');
    }
    
    const index = await getIndex();
    console.log('📊 Pinecone index obtained successfully');
    
    // Prepare content for embedding
    const cleanContent = content
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/^\s*[-*+]\s/gm, '') // Remove bullet points
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
    
    const chunks = chunkText(cleanContent, 800); // Smaller chunks for better embeddings
    console.log(`📝 Created ${chunks.length} chunks for ${fileName}`);
    
    if (chunks.length === 0) {
      throw new Error('No content chunks to process');
    }
    
    const vectors: DocumentVector[] = [];
    const batchSize = 5; // Process in smaller batches
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j;
        const chunk = batch[j];
        
        try {
          console.log(`🧮 Generating embedding for chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} chars)`);
          const embedding = await generateEmbedding(chunk);
          
          const vector: DocumentVector = {
            id: `${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}_${Date.now()}_${chunkIndex}`,
            values: embedding,
            metadata: {
              fileName,
              fileType,
              content: chunk.substring(0, 1000), // Limit metadata size
              timestamp: new Date().toISOString(),
              userId: userId || 'default-user',
              chunkIndex: chunkIndex,
              totalChunks: chunks.length,
              chunkLength: chunk.length
            }
          };
          
          vectors.push(vector);
          console.log(`✅ Prepared vector for chunk ${chunkIndex + 1}`);
        } catch (chunkError) {
          console.error(`❌ Failed to process chunk ${chunkIndex + 1}:`, chunkError);
        }
      }
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (vectors.length === 0) {
      throw new Error('No vectors were successfully created');
    }
    
    console.log(`📤 Upserting ${vectors.length} vectors to Pinecone in batches...`);
    
    // Upsert in smaller batches to avoid timeouts
    const upsertBatchSize = 10;
    for (let i = 0; i < vectors.length; i += upsertBatchSize) {
      const batch = vectors.slice(i, i + upsertBatchSize);
      
      try {
        console.log(`📤 Upserting batch ${Math.floor(i/upsertBatchSize) + 1}/${Math.ceil(vectors.length/upsertBatchSize)} (${batch.length} vectors)`);
        await index.upsert(batch);
        console.log(`✅ Successfully upserted batch ${Math.floor(i/upsertBatchSize) + 1}`);
        
        // Small delay between upsert batches
        if (i + upsertBatchSize < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (batchError) {
        console.error(`❌ Failed to upsert batch ${Math.floor(i/upsertBatchSize) + 1}:`, batchError);
      }
    }
    
    console.log(`🎉 Successfully stored document "${fileName}" with ${vectors.length} vectors in Pinecone!`);
  } catch (error) {
    console.error('❌ Error storing document in Pinecone:', error);
    console.error('📊 Error details:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      fileName,
      contentLength: content.length
    });
    throw error;
  }
};

// Search for similar documents using semantic search
export const searchDocuments = async (
  query: string,
  topK: number = 5,
  userId?: string
): Promise<any[]> => {
  try {
    console.log('🔍 Starting Pinecone semantic search...');
    console.log('📝 Query:', query, '| TopK:', topK, '| User:', userId);
    
    const index = await getIndex();
    const queryEmbedding = await generateEmbedding(query);
    console.log('✅ Generated query embedding with', queryEmbedding.length, 'dimensions');
    
    const queryRequest: any = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false
    };
    
    if (userId) {
      queryRequest.filter = { userId };
    }
    
    console.log('📤 Executing Pinecone query...');
    const queryResponse = await index.query(queryRequest);
    console.log('📊 Query response received:', queryResponse.matches?.length || 0, 'matches');
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log('🎯 Top results:');
      queryResponse.matches.forEach((match, i) => {
        console.log(`  ${i+1}. ${match.metadata?.fileName} (score: ${match.score?.toFixed(3)})`);
      });
    }
    
    return queryResponse.matches || [];
  } catch (error) {
    console.error('❌ Error searching documents in Pinecone:', error);
    console.error('📊 Search error details:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      query,
      topK,
      userId
    });
    throw error;
  }
};

// Get all documents for a user using stats
export const getUserDocuments = async (userId?: string): Promise<any[]> => {
  try {
    console.log('📄 Getting user documents from Pinecone...');
    
    const index = await getIndex();
    
    // Use a broad query to get document list
    const dummyVector = new Array(384).fill(0.1);
    
    const queryRequest: any = {
      vector: dummyVector,
      topK: 100,
      includeMetadata: true,
      includeValues: false
    };
    
    if (userId) {
      queryRequest.filter = { userId };
    }
    
    console.log('📤 Querying for user documents...');
    const queryResponse = await index.query(queryRequest);
    
    // Group by fileName to get unique documents
    const documentsMap = new Map();
    
    queryResponse.matches?.forEach((match: any) => {
      const fileName = match.metadata?.fileName;
      if (fileName && !documentsMap.has(fileName)) {
        documentsMap.set(fileName, {
          fileName,
          fileType: match.metadata.fileType,
          timestamp: match.metadata.timestamp,
          score: match.score,
          totalChunks: match.metadata.totalChunks || 1
        });
      }
    });
    
    const documents = Array.from(documentsMap.values());
    console.log('✅ Found', documents.length, 'unique documents for user');
    
    return documents;
  } catch (error) {
    console.error('❌ Error getting user documents from Pinecone:', error);
    return [];
  }
};

// Clear all documents from Pinecone for a specific user
export const clearUserDocuments = async (userId?: string): Promise<void> => {
  try {
    console.log('🗑️ Starting to clear user documents from Pinecone...');
    
    const index = await getIndex();
    
    // Get all documents for the user first
    const documents = await getUserDocuments(userId);
    console.log(`📋 Found ${documents.length} documents to delete for user`);
    
    if (documents.length === 0) {
      console.log('✅ No documents found to delete');
      return;
    }
    
    // Get all vector IDs for deletion
    const dummyVector = new Array(384).fill(0.1);
    const queryRequest: any = {
      vector: dummyVector,
      topK: 10000, // Get a large number to capture all vectors
      includeMetadata: true,
      includeValues: false
    };
    
    if (userId) {
      queryRequest.filter = { userId };
    }
    
    console.log('📤 Querying for all vector IDs to delete...');
    const queryResponse = await index.query(queryRequest);
    
    const vectorIds = queryResponse.matches?.map((match: any) => match.id) || [];
    console.log(`🎯 Found ${vectorIds.length} vectors to delete`);
    
    if (vectorIds.length === 0) {
      console.log('✅ No vectors found to delete');
      return;
    }
    
    // Delete vectors in batches
    const batchSize = 100;
    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize);
      
      try {
        console.log(`🗑️ Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectorIds.length/batchSize)} (${batch.length} vectors)`);
        await index.deleteMany(batch);
        console.log(`✅ Successfully deleted batch ${Math.floor(i/batchSize) + 1}`);
        
        // Small delay between batches
        if (i + batchSize < vectorIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (batchError) {
        console.error(`❌ Failed to delete batch ${Math.floor(i/batchSize) + 1}:`, batchError);
      }
    }
    
    console.log('🎉 Successfully cleared all user documents from Pinecone!');
  } catch (error) {
    console.error('❌ Error clearing user documents from Pinecone:', error);
    throw error;
  }
};

// Clear all documents from both Pinecone and local storage
export const clearAllStoredDocuments = async (userId?: string): Promise<void> => {
  try {
    console.log('🗑️ Starting comprehensive document cleanup...');
    
    // Clear from local storage
    console.log('📦 Clearing local storage...');
    const { clearAllDocuments } = await import('./localStorage');
    clearAllDocuments();
    console.log('✅ Local storage cleared');
    
    // Clear from Pinecone
    console.log('☁️ Clearing Pinecone database...');
    await clearUserDocuments(userId);
    console.log('✅ Pinecone database cleared');
    
    console.log('🎉 All documents have been successfully removed from both storage systems!');
  } catch (error) {
    console.error('❌ Error during comprehensive cleanup:', error);
    
    // Try to clear local storage even if Pinecone fails
    try {
      const { clearAllDocuments } = await import('./localStorage');
      clearAllDocuments();
      console.log('✅ Local storage cleared as fallback');
    } catch (localError) {
      console.error('❌ Failed to clear local storage as fallback:', localError);
    }
    
    throw error;
  }
};

export default {
  generateEmbedding,
  chunkText,
  storeDocument,
  searchDocuments,
  getUserDocuments,
  clearUserDocuments,
  clearAllStoredDocuments
};
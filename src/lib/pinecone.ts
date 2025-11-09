import { Pinecone } from '@pinecone-database/pinecone';

// Pinecone client configuration
let pineconeClient: Pinecone | null = null;

export const initializePinecone = async (): Promise<Pinecone> => {
  if (pineconeClient) {
    console.log('♻️ Reusing existing Pinecone client');
    return pineconeClient;
  }

  try {
    console.log('🚀 Initializing Pinecone client...');
    const apiKey = import.meta.env.VITE_PINECONE_API_KEY;
    
    console.log('🔍 Environment check:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      indexName: import.meta.env.VITE_PINECONE_INDEX_NAME
    });
    
    if (!apiKey) {
      throw new Error('Pinecone API key not found in environment variables');
    }

    pineconeClient = new Pinecone({
      apiKey: apiKey,
    });

    console.log('✅ Pinecone client initialized successfully');
    return pineconeClient;
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error);
    throw error;
  }
};

export const getPineconeClient = (): Pinecone => {
  if (!pineconeClient) {
    throw new Error('Pinecone client not initialized. Call initializePinecone() first.');
  }
  return pineconeClient;
};

// Index management
export const getIndex = async () => {
  const client = await initializePinecone();
  const indexName = import.meta.env.VITE_PINECONE_INDEX_NAME || 'pulse-documents';
  
  try {
    console.log(`📊 Getting Pinecone index: ${indexName}`);
    
    // Check if index exists
    const indexes = await client.listIndexes();
    console.log('📋 Available indexes:', indexes.indexes?.map(i => i.name));
    
    const indexExists = indexes.indexes?.find(index => index.name === indexName);
    
    if (!indexExists) {
      console.log(`🏗️ Creating Pinecone index: ${indexName}`);
      await client.createIndex({
        name: indexName,
        dimension: 384, // Using smaller dimension for better compatibility
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log('⏳ Waiting for index to be ready...');
      // Wait for index to be ready with progress updates
      let retries = 0;
      const maxRetries = 30;
      
      while (retries < maxRetries) {
        try {
          const indexStats = await client.index(indexName).describeIndexStats();
          console.log(`✅ Index is ready! Total vectors: ${indexStats.totalVectorCount}`);
          break;
        } catch (e) {
          retries++;
          console.log(`⏳ Index not ready yet (${retries}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (retries >= maxRetries) {
        console.warn('⚠️ Index creation timeout, but proceeding...');
      }
    }
    
    const index = client.index(indexName);
    console.log('✅ Successfully got Pinecone index');
    return index;
  } catch (error) {
    console.error('❌ Error managing Pinecone index:', error);
    throw error;
  }
};

export default { initializePinecone, getPineconeClient, getIndex };
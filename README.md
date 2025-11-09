# Pulse Bot

## Project info

A modern AI-powered chat application built with React and TypeScript, featuring intelligent document analysis and vector-based search capabilities.

## ✨ Key Features

- 💬 **Intelligent Conversations** - Powered by Google Gemini 2.5 Flash
- 🎤 **Voice Input** - Speech-to-text for hands-free interaction
- 📄 **Document Upload & Analysis** - PDF, Word, text files with smart processing
- 🖼️ **Image Analysis** - Visual content understanding and OCR capabilities
- 🔍 **Smart Search** - Vector-based semantic search across all documents
- 📱 **Responsive Design** - Beautiful UI with dark/light theme support
- ⚡ **Real-time Streaming** - Live AI responses as they're generated
- 💾 **Persistent Storage** - Chat history and document indexing

## 🤖 AI & Advanced Features

### **Large Language Model (LLM)**
- **Google Gemini 2.5 Flash** - Powers the conversational AI with advanced natural language understanding
- Empathetic and context-aware responses  
- Real-time streaming responses
- Multi-modal capabilities (text, images, documents)

### **🎤 Speech-to-Text**
- **Web Speech API** - Native browser speech recognition
- Real-time voice-to-text conversion
- Continuous listening with interim results
- Support for multiple languages
- Hands-free interaction capability

### **📄 Document Analysis**
- **PDF Processing** - Advanced text extraction using PDF.js with intelligent fallbacks
- **Word Documents** - Full .doc/.docx support via Mammoth.js  
- **Text Files** - Plain text, CSV, JSON, Markdown support
- **Smart Content Recognition** - Automatic document type detection
- **Context-Aware Analysis** - Document-specific intelligent responses

### **🖼️ Image Analysis**  
- **Multi-format Support** - JPEG, PNG, GIF, WebP, and more
- **Visual Content Understanding** - Powered by Gemini's vision capabilities
- **OCR-Ready** - Prepared for text extraction from images
- **Base64 Processing** - Secure image handling and analysis

### **🔍 Vector Database & Search**  
- **Pinecone** - Enables semantic search and document retrieval
- **Smart Document Storage** - Automatic indexing of uploaded content
- **Similarity Search** - Find relevant information across all documents
- **Fallback System** - Local storage when cloud services unavailable
- **Context-Enhanced Responses** - AI answers enriched with document knowledge

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

**Frontend & Build Tools:**
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

**AI & Backend Services:**
- **Google Gemini 2.5 Flash** (LLM)
- **Pinecone** (Vector Database)
- Supabase (Backend & Edge Functions)

**Additional Libraries:**
- Tanstack Query (Data fetching)
- Lucide React (Icons)
- PDF.js (PDF processing)
- Mammoth (Word document processing)

## How can I deploy this project?

This project can be deployed to various platforms like Vercel, Netlify, or any static hosting service. Simply build the project with `npm run build` and deploy the `dist` folder.

Project ScreenShots

<img width="1247" height="906" alt="image" src="https://github.com/user-attachments/assets/991f246a-ef7c-48c5-90e6-c784e27c8b44" />

<img width="1564" height="830" alt="image" src="https://github.com/user-attachments/assets/dfa9afb9-63ec-4e5c-acf1-b2aaef83aad9" />

<img width="1502" height="835" alt="image" src="https://github.com/user-attachments/assets/de7b85a2-fe1c-49bb-a33b-d400e09657ce" />




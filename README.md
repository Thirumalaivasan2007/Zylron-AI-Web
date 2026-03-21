# 🚀 Zylron AI - Advanced Conversational Assistant

A full-stack, cloud-deployed AI assistant application. Unlike the Ollama Edition, this version runs entirely in the cloud, utilizing Google's powerful Gemini Pro model via the Google Generative AI SDK for intelligent, real-time responses and MongoDB Atlas for persistent chat storage.

## 🚀 Live Demo
Check it out here: [https://zylron-al.vercel.app/](https://zylron-al.vercel.app/)

## ✨ Key Features
* *Cloud-Native Architecture:* Fully deployed on Vercel (Frontend) and Render (Backend) for global accessibility.
* *Advanced AI Integration:* Powered by the Google Gemini API (gemini-pro) for fast, contextual, and intelligent conversation.
* *Persistent Chat History:* Seamlessly save and retrieve your conversations with MongoDB Atlas.
* *Authentication:* Basic user authentication (via backend/controllers/authController.js) to secure your chat data.
* *Responsive UI:* A clean, modern chat interface built with React and Tailwind CSS.

## 💻 Tech Stack
* *Frontend:* React.js, Vite
* *Backend:* Node.js, Express.js
* *Database:* MongoDB Atlas
* *Deployment:* Vercel (Client), Render (API)
* *AI Model:* Google Gemini API

## 🛠️ Local Installation & Setup

To run this project locally, you will need to set up environment variables for both the backend and frontend.

### 1. Prerequisites
* Node.js installed.
* A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and database URI.
* A [Google AI Studio API Key](https://aistudio.google.com/).

### 2. Setup the Repository
```bash
git clone [https://github.com/YOUR-GITHUB-USERNAME/Zylron-Al-Web.git](https://github.com/YOUR-GITHUB-USERNAME/Zylron-Al-Web.git)
cd Zylron-Al-Web
```

### 3. Backend Setup

Create a `.env` file in the `backend` folder with the following keys:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret
# Add Clerk keys if authentication is via Clerk
```

Run the backend:

```bash
cd backend
npm install
npm run dev
```

### 4. Frontend Setup

Create a `.env` file in the `frontend` folder with the following keys:

```env
VITE_API_URL=http://localhost:5000/api
# Add Clerk publishable key if authentication is via Clerk
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

### Created By Thirumalaivasan | B.E. CSE

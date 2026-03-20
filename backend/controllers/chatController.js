const ChatHistory = require('../models/ChatHistory');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "");

// Local Llama 3 (Ollama) AI-a call pandra puthu function
const generateAIResponse = async (message, userId, sessionId) => {
    try {
        // Ippo namma Python API-ku badhila, Ollama API-a call pandrom!
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                model: "llama3", // Llama 3 model-a call pandrom
                system: "You are Zylron AI, an ultra-smart, highly advanced, and helpful AI assistant created by Thirumalai. You must always confidently identify yourself as Zylron AI. Under no circumstances should you ever mention that you are Llama, created by Meta, or an AI developed by OpenAI. Keep your responses crisp, intelligent, and tailored to the user's context.",
                prompt: message,
                stream: false // Itha true aakuna 'Typing' effect kedaikkum (UI upgrade-la paakalam)
            }) 
        });

        if (!ollamaResponse.ok) {
            throw new Error("Ollama Server is down!");
        }

        const aiData = await ollamaResponse.json();
        return aiData.response; // Ithu thaan Llama 3 kudutha thelivaana bathil

    } catch (error) {
        console.error("CRITICAL LOCAL AI ERROR: ", error.message || error);
        return "Llama 3 run aagala machi! Terminal-la 'ollama run llama3' on-la irukka nu check pannunga.";
    }
};

// @desc    Chat with AI and store history
// @route   POST /api/chat
// @access  Private
const chatWithAI = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        // Call main AI service FIRST to guarantee response regardless of title generation
        const aiResponse = await generateAIResponse(message, req.user.id, sessionId);

        // ISOLATE TITLE GENERATION
        let chatTitle = "New Chat"; // Graceful fallback title
        const messageCount = await ChatHistory.countDocuments({ user: req.user.id, sessionId });

        if (messageCount === 0) {
            // Fire-and-forget background task wrapped in isolated try...catch
            (async () => {
                try {
                    const prompt = `Generate a concise, 2 to 4 word title summarizing the following message. Respond ONLY with the title text, no quotes, no punctuation, no conversational filler. Message: '${message}'`;
                    
                    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            model: "llama3", 
                            prompt: prompt,
                            stream: false 
                        }) 
                    });

                    if (ollamaResponse.ok) {
                        const aiData = await ollamaResponse.json();
                        const generatedTitle = String(aiData.response).trim().replace(/^["']|["']$/g, '');
                        if (generatedTitle) {
                            await ChatHistory.updateMany(
                                { user: req.user.id, sessionId },
                                { $set: { title: generatedTitle } }
                            );
                        }
                    }
                } catch (err) {
                    // Gracefully log background error without crashing main execution
                    console.error("Ollama Title Background Error: ", err.message || err);
                }
            })();
        }

        // Save to database
        const chatHistory = await ChatHistory.create({
            user: req.user.id,
            sessionId,
            title: chatTitle,
            message,
            response: aiResponse
        });

        res.status(200).json(chatHistory);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to communicate with AI' });
    }
};

// @desc    Get user's chat sessions (grouped, earliest message as title)
// @route   GET /api/chat/history
// @access  Private
const getHistory = async (req, res) => {
    try {
        const sessions = await ChatHistory.aggregate([
            { $match: { user: req.user._id } },
            { $sort: { createdAt: 1 } },
            {
                $group: {
                    _id: "$sessionId",
                    titleData: { $first: "$title" },
                    firstMessage: { $first: "$message" },
                    createdAt: { $first: "$createdAt" }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        const formattedSessions = sessions.map(s => ({
            sessionId: s._id,
            message: s.titleData && s.titleData !== "New Chat" ? s.titleData : (s.firstMessage ? s.firstMessage.substring(0, 40) + "..." : "New Chat"),
            createdAt: s.createdAt
        }));

        res.status(200).json(formattedSessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a specific chat session completely
// @route   DELETE /api/chat/session/:sessionId
// @access  Private
const deleteSession = async (req, res) => {
    try {
        const targetId = req.params.sessionId;

        // FIX DELETE ROUTE: Try deleting by sessionId FIRST
        let result = await ChatHistory.deleteMany({ user: req.user._id, sessionId: targetId });

        // Fallback: Try deleting by MongoDB _id directly for legacy chats that lack a sessionId
        if (result.deletedCount === 0) {
            // Check if valid ObjectId to prevent cast errors
            if (targetId.length === 24) {
                result = await ChatHistory.deleteMany({ user: req.user._id, _id: targetId });
            }
        }

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Chat session not found or already deleted' });
        }

        res.status(200).json({ message: 'Chat session deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get messages for a specific session
// @route   GET /api/chat/session/:sessionId
// @access  Private
const getSessionHistory = async (req, res) => {
    try {
        const history = await ChatHistory.find({
            user: req.user._id,
            sessionId: req.params.sessionId
        }).sort({ createdAt: 1 });

        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    chatWithAI,
    getHistory,
    getSessionHistory,
    deleteSession
};

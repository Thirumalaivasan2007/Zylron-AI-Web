const ChatHistory = require('../models/ChatHistory');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Initialize official Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Simple, clean AI response function with AUTO-FALLBACK
const generateAIResponse = async (message) => {
    const systemInstruction = "You are Zylron AI, an ultra-smart, highly advanced, and helpful AI assistant created by Thirumalai. Keep your responses crisp, intelligent, and tailored to the user's context.";
    
    // Attempt 1: Gemini 1.5 Flash (Fastest)
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });
        const result = await model.generateContent(message);
        return result.response.text();
    } catch (flashError) {
        console.warn("Gemini 1.5 Flash failed (likely 404), falling back to Gemini Pro...", flashError.message);
        
        // Attempt 2: Gemini Pro (Most Compatible)
        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-pro"
                // Note: older SDKs/models might require system prompt in the message instead of systemInstruction
            });
            const result = await model.generateContent(`${systemInstruction}\n\nUser Message: ${message}`);
            return result.response.text();
        } catch (proError) {
            console.error("CRITICAL: All Gemini models failed:", proError);
            return "Zylron AI is currently experiencing a connection issue. Please check your API Key and Render logs.";
        }
    }
};

// @desc    Chat with AI and store history
// @route   POST /api/chat
// @access  Private
const chatWithAI = async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ message: 'Message and Session ID are required' });
        }

        // Get AI Response
        const aiResponse = await generateAIResponse(message);

        // Simple Title Generation for new chat
        let chatTitle = "New Chat";
        const messageCount = await ChatHistory.countDocuments({ user: req.user.id, sessionId });
        
        if (messageCount === 0) {
            try {
                // Use gemini-pro for title as it's most reliable for short tasks
                const titleModel = genAI.getGenerativeModel({ model: "gemini-pro" });
                const titlePrompt = `Summarize this message in 2 to 4 words for a chat title. Only give the title, no quotes. Message: '${message}'`;
                const titleResult = await titleModel.generateContent(titlePrompt);
                chatTitle = titleResult.response.text().trim().replace(/^["']|["']$/g, '');
            } catch (err) {
                console.error("Title Generation Error:", err);
            }
        }

        // Save to Database
        const chatHistory = await ChatHistory.create({
            user: req.user.id,
            sessionId,
            title: chatTitle,
            message,
            response: aiResponse
        });

        res.status(200).json(chatHistory);
    } catch (error) {
        console.error("Chat Controller Error:", error);
        res.status(500).json({ message: 'Failed to communicate with AI' });
    }
};

// @desc    Get user's chat sessions
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

        let result = await ChatHistory.deleteMany({ user: req.user._id, sessionId: targetId });

        if (result.deletedCount === 0 && targetId.length === 24) {
            result = await ChatHistory.deleteMany({ user: req.user._id, _id: targetId });
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
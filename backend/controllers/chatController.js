const ChatHistory = require('../models/ChatHistory');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Generative AI with your API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "");

/**
 * @desc    Generate a response using Google Gemini AI SDK
 * @param   {string} message - User input
 */
const generateAIResponse = async (message, userId, sessionId) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing from environment variables!");
        }

        // Initialize the model (using gemini-pro for stability)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro",
            systemInstruction: "You are Zylron AI, an ultra-smart, highly advanced, and helpful AI assistant created by Thirumalai. You must always confidently identify yourself as Zylron AI. Under no circumstances should you ever mention that you are Llama, created by Meta, or an AI developed by OpenAI. Keep your responses crisp, intelligent, and tailored to the user's context."
        });

        const result = await model.generateContent(message);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("GEMINI SDK ERROR: ", error);
        
        // Fallback for production stability
        return "Zylron AI is currently experiencing a connection issue. Please check your GEMINI_API_KEY in Render environment variables.";
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

        // Get AI response
        const aiResponse = await generateAIResponse(message, req.user.id, sessionId);

        let chatTitle = "New Chat";
        const messageCount = await ChatHistory.countDocuments({ user: req.user.id, sessionId });

        // Generate title for the first message in background
        if (messageCount === 0) {
            (async () => {
                try {
                    const titleModel = genAI.getGenerativeModel({ model: "gemini-pro" });
                    const titlePrompt = `Generate a concise, 2 to 4 word title summarizing the following message. Respond ONLY with the title text, no quotes, no punctuation, no conversational filler. Message: '${message}'`;
                    const result = await titleModel.generateContent(titlePrompt);
                    const generatedTitle = result.response.text().trim().replace(/^["']|["']$/g, '');
                    
                    if (generatedTitle) {
                        await ChatHistory.updateMany(
                            { user: req.user.id, sessionId },
                            { $set: { title: generatedTitle } }
                        );
                    }
                } catch (err) {
                    console.error("Gemini Title SDK Error: ", err.message || err);
                }
            })();
        }

        // Save session to history
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

        if (result.deletedCount === 0) {
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
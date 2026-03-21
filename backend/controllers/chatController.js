const ChatHistory = require('../models/ChatHistory');
const { GoogleGenerativeAI } = require("@google/generative-ai");


// const { GoogleGenerativeAI } = require("@google/generative-ai"); // REMOVED SDK

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : ""); // REMOVED SDK INIT

if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables!");
}

// Google Gemini API response generation using DIRECT REST API (Stable v1)
const generateAIResponse = async (message, userId, sessionId) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing!");

        // DIAGNOSTIC SERVICE: List models to logs to see what's available
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();
            console.log("DIAGNOSTIC - AVAILABLE MODELS FOR THIS KEY: ", (listData.models || []).map(m => m.name).join(", "));
        } catch (e) {
            console.warn("Diagnostic listModels failed: ", e.message);
        }

        // Forced v1 STABLE endpoint 
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nUser Message: ${message}` }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("GEMINI REST API ERROR DETAILS: ", JSON.stringify(data, null, 2));
            throw new Error(data.error?.message || "Google API returned an error");
        }

        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("GEMINI AI CRITICAL ERROR: ", error);
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

        // Call main AI service FIRST to guarantee response regardless of title generation
        const aiResponse = await generateAIResponse(message, req.user.id, sessionId);

        // ISOLATE TITLE GENERATION
        let chatTitle = "New Chat"; // Graceful fallback title
        const messageCount = await ChatHistory.countDocuments({ user: req.user.id, sessionId });

        if (messageCount === 0) {
            // Fire-and-forget background task wrapped in isolated try...catch
            (async () => {
                try {
                    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
                    const prompt = `Generate a concise, 2 to 4 word title summarizing the following message. Respond ONLY with the title text, no quotes, no punctuation, no conversational filler. Message: '${message}'`;
                    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const generatedTitle = String(data.candidates[0].content.parts[0].text).trim().replace(/^["']|["']$/g, '');
                        if (generatedTitle) {
                            await ChatHistory.updateMany(
                                { user: req.user.id, sessionId },
                                { $set: { title: generatedTitle } }
                            );
                        }
                    }
                } catch (err) {
                    console.error("Gemini Title Background Error: ", err.message || err);
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

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing from .env");
        return;
    }

    console.log("🔍 Testing Gemini API Key (starts with:", key.substring(0, 8) + "...)");
    const genAI = new GoogleGenerativeAI(key);

    try {
        console.log("📡 Attempting to reach gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello, are you active?");
        console.log("✅ SUCCESS! Response:", result.response.text());
    } catch (error) {
        console.error("❌ FAILED!");
        console.error("Error Message:", error.message);
        console.error("Status:", error.status);
    }
}

testGemini();

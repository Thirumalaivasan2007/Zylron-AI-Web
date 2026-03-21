require('dotenv').config();
const axios = require('axios');

async function listModels() {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing from .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
    console.log("🔍 Fetching available models for this key...");

    try {
        const response = await axios.get(url);
        const data = response.data;
        
        if (data.models && data.models.length > 0) {
            console.log("✅ Models Found:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("❌ No models found or error in response.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("❌ Fetch Error:", error.response ? error.response.data : error.message);
    }
}

listModels();

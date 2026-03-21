require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAllModels() {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing");
        return;
    }

    const genAI = new GoogleGenerativeAI(key);
    
    // List of common models to try
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-pro",
        "gemini-1.0-pro",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-2.5-flash",
        "gemini-2.0-pro-exp-02-05",
        "gemini-1.5-pro"
    ];

    console.log("🔍 Testing multiple Gemini models to find a working one...");

    for (const modelId of modelsToTest) {
        process.stdout.write(`Testing ${modelId}... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent("Say 'hello'");
            const text = result.response.text().trim();
            console.log(`✅ SUCCESS! Responded: "${text}"`);
        } catch (error) {
            if (error.status === 404) {
                console.log(`❌ 404 Not Found`);
            } else if (error.status === 429) {
                console.log(`❌ 429 Rate Limited (Limit exhausted or 0)`);
            } else {
                console.log(`❌ Error: ${error.message.substring(0, 50)}`);
            }
        }
    }
}

testAllModels();

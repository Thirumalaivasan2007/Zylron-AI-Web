require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function runTests() {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) {
        fs.writeFileSync('test-out.json', JSON.stringify({ error: "Missing Key" }));
        return;
    }

    const genAI = new GoogleGenerativeAI(key);
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-pro",
        "gemini-1.0-pro",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-2.5-flash",
        "gemini-2.0-pro-exp-02-05",
        "gemini-1.5-pro",
        "gemini-2.0-flash"
    ];

    const results = {};

    for (const modelId of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent("hello");
            results[modelId] = "OK - " + result.response.text().trim();
        } catch (error) {
            results[modelId] = `Error ${error.status}: ${error.message}`;
        }
    }

    fs.writeFileSync('test-out.json', JSON.stringify(results, null, 2), 'utf8');
}

runTests();

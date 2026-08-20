require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const candidates = [
    "gemini-3.6-flash",
    "gemini-3.6-pro",
    "gemini-3.6-flash-lite",
    "gemini-3.5-flash"
  ];

  for (const modelName of candidates) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, reply with 1 word: Hi");
      console.log(` SUCCESS with ${modelName}:`, result.response.text());
    } catch (e) {
      console.log(` FAILED with ${modelName}:`, e.message);
    }
  }
}

testModels();

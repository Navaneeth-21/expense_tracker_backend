// src/controllers/chatbotController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const processChatbotRequest = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ success: false, error: "Invalid prompt format" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);

    // Ensure result structure is correct before accessing properties
    const botReply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I'm not sure how to respond.";

    return res.json({ success: true, message: botReply });
  } catch (error) {
    console.error("Chatbot Error:", error);

    if (error.response?.status === 403) {
      return res.status(403).json({ success: false, error: "Invalid API key or exceeded quota." });
    }

    return res.status(500).json({ success: false, error: "Chatbot processing failed." });
  }
};

module.exports = { processChatbotRequest };

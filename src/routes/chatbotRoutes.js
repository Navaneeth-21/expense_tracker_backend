// src/routes/chatbotRoutes.js
const express = require("express");
const { processChatbotRequest } = require("../controllers/chatbotController");
const { processNlpToSqlRequest } = require("../controllers/nlpToSqlController")
const authenticateToken = require("../middlewares/auth")

const router = express.Router();

router.post("/chatbot", processChatbotRequest);
router.post("/nlp-to-sql", authenticateToken, processNlpToSqlRequest);

module.exports = router;

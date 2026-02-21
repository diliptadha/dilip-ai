import "dotenv/config";

import documentIntelligenceRouter from "./routes/documentIntelligence.js";
import express from "express";
import textToSpeechRouter from "./routes/textToSpeech.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/document-intelligence", documentIntelligenceRouter);
app.use("/api/text-to-speech", textToSpeechRouter);

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SarvamAI API",
    version: "1.0.0",
    endpoints: {
      documentIntelligence: {
        health: "GET /api/document-intelligence/health",
        process: "POST /api/document-intelligence/process",
      },
      textToSpeech: {
        health: "GET /api/text-to-speech/health",
        convert: "POST /api/text-to-speech/convert",
        download: "GET /api/text-to-speech/download/:filename",
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;

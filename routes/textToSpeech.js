import { SarvamAIClient } from "sarvamai";
import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Directory to store generated audio files
const AUDIO_DIR = "./audio";
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * POST /api/text-to-speech/convert
 * Converts text to speech using SarvamAI Text-to-Speech API
 * Saves the audio file and returns a download URL.
 *
 * Body (application/json):
 *   - text: The text to convert (required)
 *   - target_language_code: BCP-47 language code (default: "hi-IN")
 *   - speaker: Voice speaker name (default: "shubh")
 *   - pace: Speech pace multiplier (default: 1.0)
 *   - speech_sample_rate: Audio sample rate in Hz (default: 22050)
 *   - enable_preprocessing: Enable text preprocessing (default: true)
 *   - model: TTS model to use (default: "bulbul:v3")
 */
router.post("/convert", async (req, res) => {
  const {
    text,
    target_language_code = "en-IN",
    speaker = "shubh",
    pace = 1.0,
    speech_sample_rate = 22050,
    enable_preprocessing = true,
    model = "bulbul:v3",
  } = req.body;

  // Validate required field
  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "The 'text' field is required and must be a non-empty string.",
    });
  }

  try {
    // Initialize SarvamAI client
    const client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY,
    });

    console.log(`Converting text to speech [lang: ${target_language_code}, speaker: ${speaker}, model: ${model}]`);

    // Call SarvamAI Text-to-Speech API
    const response = await client.textToSpeech.convert({
      text: text.trim(),
      target_language_code,
      speaker,
      pace,
      speech_sample_rate,
      enable_preprocessing,
      model,
    });

    console.log("Text-to-speech conversion successful");

    // Save each audio chunk as a WAV file and build download URLs
    const downloadUrls = [];
    const audios = response.audios || [];

    audios.forEach((base64Audio, index) => {
      const filename = `tts_${Date.now()}_${index}.wav`;
      const filePath = path.join(AUDIO_DIR, filename);
      const audioBuffer = Buffer.from(base64Audio, "base64");
      fs.writeFileSync(filePath, audioBuffer);

      const host = req.get("host");
      const protocol = req.protocol;
      downloadUrls.push({
        filename,
        url: `${protocol}://${host}/api/text-to-speech/download/${filename}`,
      });
    });

    console.log(`Saved ${downloadUrls.length} audio file(s)`);

    return res.status(200).json({
      success: true,
      message: "Text converted to speech successfully",
      data: {
        downloadUrls,
        request: {
          target_language_code,
          speaker,
          pace,
          speech_sample_rate,
          enable_preprocessing,
          model,
        },
      },
    });
  } catch (error) {
    console.error("Error converting text to speech:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to convert text to speech",
      error: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/text-to-speech/download/:filename
 * Downloads a generated audio file by filename
 */
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;

  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(AUDIO_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: `Audio file '${safeFilename}' not found.`,
    });
  }

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
  res.sendFile(path.resolve(filePath));
});

/**
 * GET /api/text-to-speech/health
 * Health check for the text-to-speech route
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Text-to-Speech route is healthy",
  });
});

export default router;

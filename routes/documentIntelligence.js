import { SarvamAIClient } from "sarvamai";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
// Note: fs is used for temp file handling during upload

const router = express.Router();

// Configure multer for file uploads (store in memory)
// SarvamAI Document Intelligence only accepts PDF (.pdf) or ZIP (.zip) files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".zip"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF (.pdf) or ZIP (.zip) files are allowed"), false);
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit (SarvamAI max)
});

/**
 * POST /api/document-intelligence/process
 * Processes a document using SarvamAI Document Intelligence
 *
 * Body (multipart/form-data):
 *   - file: The document file (PDF or ZIP of images)
 *   - language: Language code (default: "en-IN")
 *   - output_format: Output format (default: "html")
 */
router.post("/process", upload.single("file"), async (req, res) => {
  // Validate file upload
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please upload a PDF (.pdf) or ZIP (.zip) file.",
    });
  }

  const language = req.body.language || "en-IN";
  const output_format = req.body.output_format || "html";

  try {
    // Initialize SarvamAI client
    // SDK automatically reads SARVAM_API_KEY from environment variables
    const client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY,
    });

    // Step 1: Create a document intelligence job
    console.log("Creating document intelligence job...");
    const job = await client.documentIntelligence.createJob({
      language,
      outputFormat: output_format,
    });
    console.log(`Job created: ${job.jobId}`);

    // Step 2: Save uploaded file temporarily and upload to SarvamAI
    const tempFilePath = `./temp_${Date.now()}_${req.file.originalname}`;
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
      console.log("Uploading file...");
      await job.uploadFile(tempFilePath);
      console.log("File uploaded");
    } finally {
      // Always clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Step 3: Start processing
    console.log("Starting job...");
    await job.start();
    console.log("Job started");

    // Step 4: Wait for completion
    console.log("Waiting for job to complete...");
    const status = await job.waitUntilComplete();
    console.log(`Job completed with state: ${status.job_state}`);

    // Step 5: Get page metrics (synchronous — reads from cached status)
    const metrics = job.getPageMetrics();
    console.log(`Page metrics: ${JSON.stringify(metrics)}`);

    // Step 6: Get download links for the output ZIP
    const downloadLinks = await job.getDownloadLinks();
    console.log(`Download links retrieved`);
   

    // Return success response with download URL
    return res.status(200).json({
      success: true,
      message: "Document processed successfully",
      data: {
        jobId: job.jobId,
        jobState: status.job_state,
        pageMetrics: metrics,
        downloadLinks
      },
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process document",
      error: error.message || "Internal server error",
    });
  }
});

/**
 * GET /api/document-intelligence/health
 * Health check for the document intelligence route
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Document Intelligence route is healthy",
  });
});

export default router;

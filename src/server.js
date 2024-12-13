import express from 'express';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import YoutubeService from './services/YoutubeService.js';
import OpenAIService from './services/OpenAIService.js';
import LoopsService from './services/LoopsService.js';
import TranscriptController from './controllers/TranscriptController.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const youtubeService = new YoutubeService();
const openaiService = new OpenAIService(process.env.OPENAI_API_KEY);
const loopsService = new LoopsService(process.env.LOOPS_API_KEY);

// Initialize controller
const transcriptController = new TranscriptController(
  youtubeService,
  openaiService,
  loopsService
);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      youtube: !!youtubeService,
      openai: !!process.env.OPENAI_API_KEY,
      loops: !!process.env.LOOPS_API_KEY
    }
  });
});

// Routes
app.get('/transcript/:videoId', (req, res) => transcriptController.getTranscript(req, res));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`Server is running on port ${port}`);
});

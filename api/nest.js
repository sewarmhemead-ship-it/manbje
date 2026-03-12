// Vercel serverless handler: all /api and /api/* are rewritten to /api/nest (see vercel.json).
// This file loads the NestJS serverless entry (backend must be built first).
module.exports = require('../backend/dist/vercel-entry').default;

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Import mock data
const mockObjects = require('./data/objects');
const vocabulary = require('./data/vocabulary');
const extraction = require('./data/extraction');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  Body:', JSON.stringify(req.body));
  }
  next();
});

// POST /key - Get API Key
app.post('/key', (req, res) => {
  const { deviceId, bundleId, appVersion } = req.body;
  
  if (!deviceId || !bundleId || !appVersion) {
    console.log('  Response: 400 - Missing required fields');
    return res.status(400).json({
      error: 'Missing required fields: deviceId, bundleId, appVersion'
    });
  }
  
  const now = Date.now();
  const response = {
    apiKey: `mock-api-key-${Math.random().toString(36).substr(2, 16)}`,
    issuedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000
  };
  
  console.log('  Response: 200 - API key generated');
  res.json(response);
});

// GET /objects - List Objects
app.get('/objects', (req, res) => {
  const objects = mockObjects.getMockObjects();
  console.log(`  Response: 200 - ${objects.length} objects`);
  res.json({
    objects,
    count: objects.length
  });
});

// GET /objects/:key - Get Object
app.get('/objects/:key', (req, res) => {
  const { key } = req.params;
  const object = mockObjects.getMockObject(key);
  
  if (!object) {
    console.log(`  Response: 404 - Object not found: ${key}`);
    return res.status(404).json({
      error: `Object not found: ${key}`
    });
  }
  
  console.log(`  Response: 200 - Object: ${key}`);
  res.json(object);
});

// PUT /objects/:key - Update Object
app.put('/objects/:key', (req, res) => {
  const { key } = req.params;
  const { title, body } = req.body;
  
  const result = mockObjects.updateMockObject(key, title, body);
  
  if (!result) {
    console.log(`  Response: 404 - Object not found: ${key}`);
    return res.status(404).json({
      error: `Object not found: ${key}`
    });
  }
  
  console.log(`  Response: 200 - Object updated: ${key}`);
  res.json(result);
});

// POST /lookup - Lookup Vocabulary
app.post('/lookup', (req, res) => {
  const { vocabulary: word } = req.body;
  
  if (!word) {
    console.log('  Response: 400 - Missing vocabulary field');
    return res.status(400).json({
      error: 'Missing required field: vocabulary'
    });
  }
  
  const lookup = vocabulary.getMockVocabulary(word);
  console.log(`  Response: 200 - Lookup: ${word}`);
  res.json(lookup);
});

// POST /extract - Extract Documents
app.post('/extract', (req, res) => {
  // In a real implementation, this would handle file uploads
  // For mock, we'll accept a simple request
  const fileInfos = [{ filename: 'mock-file.pdf', size: 1024 }];
  const response = extraction.createMockExtractionJob(fileInfos);
  console.log('  Response: 200 - Extraction job created');
  res.json(response);
});

// GET /extract/:jobId - Get Extraction Status
app.get('/extract/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = extraction.getMockExtractionStatus(jobId);
  
  if (!status) {
    console.log(`  Response: 404 - Job not found: ${jobId}`);
    return res.status(404).json({
      error: `Job not found: ${jobId}`
    });
  }
  
  console.log(`  Response: 200 - Job status: ${jobId}`);
  res.json(status);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('  Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /key');
  console.log('  GET  /objects');
  console.log('  GET  /objects/:key');
  console.log('  PUT  /objects/:key');
  console.log('  POST /lookup');
  console.log('  POST /extract');
  console.log('  GET  /extract/:jobId');
});

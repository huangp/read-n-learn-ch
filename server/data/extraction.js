// CommonJS version for Node.js mock server

const extractionJobs = new Map();

const createMockExtractionJob = (fileInfos) => {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  const job = {
    jobId,
    status: 'pending',
    files: fileInfos,
    createdAt: now,
    updatedAt: now,
  };
  
  extractionJobs.set(jobId, job);
  
  // Simulate processing
  setTimeout(() => {
    job.status = 'processing';
    job.updatedAt = Date.now();
  }, 1000);
  
  setTimeout(() => {
    job.status = 'completed';
    job.updatedAt = Date.now();
    job.contentHash = `mock-hash-${jobId}`;
    job.extractedText = 'Mock extracted text content';
  }, 3000);
  
  return {
    jobId,
    status: 'pending',
    message: 'Extraction job created successfully',
  };
};

const getMockExtractionStatus = (jobId) => {
  const job = extractionJobs.get(jobId);
  if (!job) return null;
  
  return {
    jobId: job.jobId,
    status: job.status,
    files: job.files,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    contentHash: job.contentHash,
    extractedText: job.extractedText,
  };
};

module.exports = {
  createMockExtractionJob,
  getMockExtractionStatus,
};

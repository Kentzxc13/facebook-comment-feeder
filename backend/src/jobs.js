import { randomUUID } from 'crypto';

/**
 * In-memory store for active and completed scraping jobs.
 * Map<string, JobObject>
 */
const jobs = new Map();

/**
 * Creates a new scraping job with initial pending status.
 * @param {string} url 
 * @returns {object} job
 */
export function createJob(url) {
  const id = randomUUID();
  const job = {
    id,
    url,
    status: 'pending', // 'pending' | 'scraping' | 'completed' | 'failed'
    progress: 'Job initialized',
    comments: [],
    error: null,
    createdAt: Date.now()
  };

  jobs.set(id, job);
  return job;
}

/**
 * Retrieves a job by ID.
 * @param {string} id 
 * @returns {object|null}
 */
export function getJob(id) {
  return jobs.get(id) || null;
}

/**
 * Updates a job with new properties.
 * @param {string} id 
 * @param {object} updates 
 */
export function updateJob(id, updates) {
  const job = jobs.get(id);
  if (!job) return null;

  Object.assign(job, updates);
  return job;
}

/**
 * Optional cleanup helper to prune jobs older than TTL (e.g., 1 hour).
 */
export function pruneOldJobs(maxAgeMs = 60 * 60 * 1000) {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > maxAgeMs) {
      jobs.delete(id);
    }
  }
}

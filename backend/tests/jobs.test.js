import { describe, it, expect } from 'vitest';
import { createJob, getJob, updateJob } from '../src/jobs.js';

describe('Job Manager', () => {
  it('creates a job with initial state', () => {
    const job = createJob('https://www.facebook.com/post/1');
    expect(job.id).toBeDefined();
    expect(job.url).toBe('https://www.facebook.com/post/1');
    expect(job.status).toBe('pending');
    expect(job.progress).toBe('Job initialized');
    expect(job.comments).toEqual([]);
  });

  it('retrieves an existing job by ID', () => {
    const job = createJob('https://www.facebook.com/post/2');
    const fetched = getJob(job.id);
    expect(fetched).not.toBeNull();
    expect(fetched.id).toBe(job.id);
  });

  it('updates an existing job state', () => {
    const job = createJob('https://www.facebook.com/post/3');
    updateJob(job.id, {
      status: 'completed',
      progress: 'Extracted 10 comments',
      comments: [{ id: '1', author: 'User', date: 'now', text: 'hi' }]
    });

    const updated = getJob(job.id);
    expect(updated.status).toBe('completed');
    expect(updated.progress).toBe('Extracted 10 comments');
    expect(updated.comments.length).toBe(1);
  });

  it('returns null for non-existent job ID', () => {
    expect(getJob('non-existent-id')).toBeNull();
  });
});

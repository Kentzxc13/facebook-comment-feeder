import { describe, it, expect } from 'vitest';
import { isValidFacebookUrl } from '../src/utils/urlValidator.js';

describe('isValidFacebookUrl', () => {
  it('accepts valid facebook desktop post URLs', () => {
    expect(isValidFacebookUrl('https://www.facebook.com/user/posts/123456789').valid).toBe(true);
    expect(isValidFacebookUrl('https://facebook.com/groups/123/posts/456').valid).toBe(true);
  });

  it('accepts valid mobile and watch URLs', () => {
    expect(isValidFacebookUrl('https://m.facebook.com/story.php?story_fbid=123').valid).toBe(true);
    expect(isValidFacebookUrl('https://www.facebook.com/watch/?v=123').valid).toBe(true);
    expect(isValidFacebookUrl('https://fb.watch/xyz123/').valid).toBe(true);
  });

  it('rejects invalid or non-facebook URLs', () => {
    expect(isValidFacebookUrl('https://google.com').valid).toBe(false);
    expect(isValidFacebookUrl('https://twitter.com/post/123').valid).toBe(false);
    expect(isValidFacebookUrl('not-a-url').valid).toBe(false);
    expect(isValidFacebookUrl('').valid).toBe(false);
  });
});

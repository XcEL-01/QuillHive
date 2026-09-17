import { describe, it, expect } from 'vitest';
import { normalizeGroupCreateInput } from '../routes/groups';

describe('Group create validation', () => {
  it('allows creating a group without a category and defaults privacy', () => {
    const result = normalizeGroupCreateInput({
      name: 'Writers Circle',
      description: 'A place to share drafts.',
      privacy: 'private',
      coverUrl: 'https://example.com/cover.jpg',
    });

    expect(result).toMatchObject({
      name: 'Writers Circle',
      description: 'A place to share drafts.',
      privacy: 'private',
      coverUrl: 'https://example.com/cover.jpg',
      category: 'general',
    });
  });

  it('rejects invalid privacy values', () => {
    expect(() =>
      normalizeGroupCreateInput({
        name: 'Writers Circle',
        privacy: 'secret',
      })
    ).toThrow('Invalid privacy');
  });
});

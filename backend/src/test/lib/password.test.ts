import { describe, expect, it } from 'vitest';

import { comparePassword, hashPassword } from '../../lib/password';

// bcrypt at 12 rounds is deliberately slow; these few calls need the headroom.
describe('hashPassword / comparePassword', { timeout: 20_000 }, () => {
  it('produces a bcrypt hash rather than the plaintext', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).not.toBe('correct horse battery');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('salts, so the same password hashes differently each time', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);
    expect(a).not.toBe(b);
  });

  it('accepts the matching password', async () => {
    const hash = await hashPassword('s3cret-password');
    await expect(comparePassword('s3cret-password', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret-password');
    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('is case sensitive', async () => {
    const hash = await hashPassword('CaseSensitive1');
    await expect(comparePassword('casesensitive1', hash)).resolves.toBe(false);
  });
});

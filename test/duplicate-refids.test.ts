import { describe, it, expect, afterAll } from 'vitest';
import { loadIndex, defaultOptions, run } from '../src/index.js';
import type { Compound, Member } from '../src/types.js';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const directory = join(import.meta.dirname, 'fixtures/duplicate-refids');
const output = join(import.meta.dirname, '../.test-output-duplicates');
afterAll(() => rmSync(output, { recursive: true, force: true }));

describe('repeated Doxygen index references', () => {
  it('interns shared members, preserves every owner and parses parameters once', async () => {
    const { references, root } = await loadIndex({ ...defaultOptions, directory });
    const owners = ['group__demo', 'namespace_demo', 'demo_8hpp'].map(id => references[id] as Compound);
    const member = references.namespace_demo_1a_ping as Member;
    for (const owner of owners) {
      expect(owner.members).toEqual([member]);
      expect(owner.members[0]).toBe(member);
      expect(owner.members[0].section).toBe('func');
    }
    expect(member.parent.refid).toBe('namespace_demo');
    expect(member.params).toHaveLength(1);
    expect(member.groupid).toBe('group__demo');
    expect(root.members).toEqual([member]);
  });

  it('renders the shared documentation in both group and namespace outputs', async () => {
    await run({ directory, output: join(output, '%s.md'), groups: true, classes: true, quiet: true });
    for (const name of ['operations', 'demo']) {
      expect(readFileSync(join(output, `${name}.md`), 'utf8')).toContain('Sends a synthetic ping.');
    }
  });
});

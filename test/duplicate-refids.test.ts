import { describe, it, expect, afterAll } from 'vitest';
import { loadIndex, defaultOptions, run } from '../src/index.js';
import type { Compound, Member } from '../src/types.js';
import { readFileSync, rmSync, cpSync, writeFileSync } from 'node:fs';
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

  it('preserves a concrete section when a namespace uses a named section, in either parse order', async () => {
    for (const groupFirst of [true, false]) {
      const variant = join(output, `named-${groupFirst}`);
      cpSync(directory, variant, { recursive: true });
      const namespaceFile = join(variant, 'namespace_demo.xml');
      writeFileSync(namespaceFile, readFileSync(namespaceFile, 'utf8').replace('kind="func"', 'kind="user-defined"'));
      if (!groupFirst) {
        const group = 'group__a_very_long_demo';
        writeFileSync(join(variant, 'index.xml'), readFileSync(join(variant, 'index.xml'), 'utf8').replaceAll('group__demo', group));
        writeFileSync(join(variant, `${group}.xml`), readFileSync(join(variant, 'group__demo.xml'), 'utf8').replaceAll('group__demo', group));
      }
      const { references } = await loadIndex({ ...defaultOptions, directory: variant });
      expect((references.namespace_demo_1a_ping as Member).section).toBe('func');
      expect((references.namespace_demo_1a_ping as Member).params).toHaveLength(1);
    }
  });

  it('retains a shared member in both documented groups', async () => {
    const variant = join(output, 'multiple-groups');
    cpSync(directory, variant, { recursive: true });
    const group = readFileSync(join(variant, 'group__demo.xml'), 'utf8')
      .replaceAll('group__demo', 'group__secondary').replace('<compoundname>operations</compoundname>', '<compoundname>secondary</compoundname>');
    writeFileSync(join(variant, 'group__secondary.xml'), group);
    const index = join(variant, 'index.xml');
    writeFileSync(index, readFileSync(index, 'utf8').replace('</doxygenindex>', '<compound refid="group__secondary" kind="group"><name>secondary</name><member refid="namespace_demo_1a_ping" kind="function"><name>ping</name></member></compound></doxygenindex>'));
    await run({ directory: variant, output: join(output, 'multi', '%s.md'), groups: true, classes: true, quiet: true });
    for (const name of ['operations', 'secondary']) {
      expect(readFileSync(join(output, 'multi', `${name}.md`), 'utf8')).toContain('Sends a synthetic ping.');
    }
  });

  it('renders the shared documentation in both group and namespace outputs', async () => {
    await run({ directory, output: join(output, '%s.md'), groups: true, classes: true, quiet: true });
    for (const name of ['operations', 'demo']) {
      expect(readFileSync(join(output, `${name}.md`), 'utf8')).toContain('Sends a synthetic ping.');
    }
  });
});

import { it, expect, afterAll } from 'vitest';
import { run, generate, defaultFilters } from '../src/index.js';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const directory = join(import.meta.dirname, 'fixtures/user-defined');
const output = join(import.meta.dirname, '../.test-output-user-defined');
afterAll(() => rmSync(output, { recursive: true, force: true }));
it('includes documented user-defined sections by default in both APIs', async () => {
  await run({ directory, classes: true, output: join(output, '%s.md'), quiet: true });
  const markdown = readFileSync(join(output, 'Widget.md'), 'utf8');
  expect(markdown).toContain('A documented public named operation.');
  expect(markdown).toContain('A normal public operation.');
  expect((await generate({ directory, quiet: true }))[0].markdown).toContain('A documented public named operation.');
});
it('still respects an explicit member filter', async () => {
  const pages = await generate({ directory, quiet: true, filters: { ...defaultFilters, members: ['public-func'] } });
  expect(pages[0].markdown).not.toContain('A documented public named operation.');
});

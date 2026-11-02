import { it, expect, afterAll } from 'vitest';
import { run, defaultFilters } from '../src/index.js';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const directory = join(import.meta.dirname, 'fixtures/link-manifest');
const output = join(import.meta.dirname, '../.test-output-manifest');
afterAll(() => rmSync(output, { recursive: true, force: true }));
const filters = { ...defaultFilters, members: ['public-func', 'public-type'] };
it('exports deterministic raw targets, including enum values, only when actually drawn', async () => {
  const linkManifest = join(output, 'links.json');
  const options = { directory, output: join(output, '%s.md'), classes: true, noindex: true, quiet: true, filters, linkManifest };
  await run(options);
  const text = readFileSync(linkManifest, 'utf8');
  const manifest = JSON.parse(text);
  expect(manifest.version).toBe(1);
  expect(manifest.targets).toEqual({
    class_widget: { path: 'Widget.md', anchor: 'widget' },
    class_widget_1a_mode: { path: 'Widget.md', anchor: 'mode' },
    class_widget_1a_mode_a_fast: { path: 'Widget.md', anchor: 'mode' },
    class_widget_1a_reset: { path: 'Widget.md', anchor: 'reset' },
    class_widget_1details: { path: 'Widget.md', anchor: 'class_widget_1details' },
  });
  expect(Object.keys(manifest.targets)).toEqual(Object.keys(manifest.targets).sort());
  await run(options);
  expect(readFileSync(linkManifest, 'utf8')).toBe(text);
  await run({ ...options, anchors: false, htmlAnchors: false });
  expect(JSON.parse(readFileSync(linkManifest, 'utf8')).targets).toEqual({});
  await run({ ...options, anchors: false, htmlAnchors: true });
  expect(JSON.parse(readFileSync(linkManifest, 'utf8'))).toEqual(manifest);
});
it('does not write a manifest by default and rejects output overwrite before writing', async () => {
  const guard = join(output, 'guard');
  await expect(run({ directory, output: join(guard, '%s.md'), classes: true, quiet: true, linkManifest: join(guard, 'widget.MD') })).rejects.toThrow(/manifest.*overwrite/i);
  expect(existsSync(join(guard, 'Widget.md'))).toBe(false);
  const plain = join(output, 'plain');
  await run({ directory, output: join(plain, '%s.md'), classes: true, quiet: true });
  expect(readdirSync(plain).some(name => name.endsWith('.json'))).toBe(false);
});

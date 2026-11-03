import { it, expect, vi } from 'vitest';

const run = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../src/index.js', () => ({ run }));

it('passes --link-manifest through the CLI to the converter', async () => {
  const original = process.argv;
  try {
    process.argv = [process.execPath, 'moxygen', 'fixture-xml', '--classes',
      '--html-anchors', '--output', 'out/%s.md', '--link-manifest', 'out/links.json'];
    await import('../src/cli.js');
    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      directory: 'fixture-xml', output: 'out/%s.md', classes: true,
      htmlAnchors: true, linkManifest: 'out/links.json',
    }));
  } finally { process.argv = original; }
});

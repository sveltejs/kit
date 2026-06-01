import { expect, it } from 'vitest';
import { enhancedImages } from '../src/index.js';

it('accepts no options and returns the markup + imagetools plugins', () => {
	const plugins = enhancedImages();
	// outside a webcontainer we expect both the markup preprocessor and the imagetools instance
	expect(Array.isArray(plugins)).toBe(true);
	expect(plugins.length).toBe(2);
	expect(plugins[0].name).toBe('vite-plugin-enhanced-img-markup');
});

it('accepts a `formats` option without throwing', () => {
	const plugins = enhancedImages({ formats: ['avif', 'webp'] });
	expect(plugins.length).toBe(2);
});

it('accepts a `quality` option without throwing', () => {
	const plugins = enhancedImages({ formats: ['avif', 'webp'], quality: 80 });
	expect(plugins.length).toBe(2);
});

// TODO(sketch): assert the `format`/`quality` directives produced by the internal
// `defaultDirectives` callback. That callback is not currently exported, so a precise test
// would either export it (or a pure `resolve_directives({ formats, quality }, meta)` helper)
// and assert:
//   - no options          -> format === `avif;webp;${fallback_format(meta)}` (png when meta.hasAlpha)
//   - { formats: [...] }   -> format === 'avif;webp' and NO raster fallback is appended
//   - { quality: 80 }      -> directives include `quality=80`

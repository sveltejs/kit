import fs from 'node:fs';
import path from 'node:path';

/**
 * Wraps an adapter so tests can prove hashed fonts exist in the client output
 * before `adapt()`, without adding a fonts-specific builder API.
 *
 * @param {import('@sveltejs/kit').Adapter} inner
 * @returns {import('@sveltejs/kit').Adapter}
 */
export function fonts_probe_adapter(inner) {
	return {
		name: inner.name,
		async adapt(builder) {
			const client = builder.getClientDirectory();
			const fonts = list_fonts(client);
			fs.writeFileSync(
				path.join(path.dirname(client), 'enhanced-fonts-adapt.json'),
				JSON.stringify({
					fonts,
					has_write_fonts: 'writeFonts' in builder
				})
			);
			await inner.adapt(builder);
		}
	};
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function list_fonts(dir) {
	/** @type {string[]} */
	const fonts = [];
	if (!fs.existsSync(dir)) return fonts;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (!entry.isFile()) continue;
		if (/\.(woff2?)$/i.test(entry.name)) {
			const parent = 'parentPath' in entry ? entry.parentPath : entry.path;
			fonts.push(path.relative(dir, path.join(parent, entry.name)));
		}
	}
	return fonts;
}

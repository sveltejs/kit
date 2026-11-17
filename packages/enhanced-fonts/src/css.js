/** @import { FontDisplay } from '../types/index.js' */

/**
 * @typedef {{ url: string; weight?: string; style?: string; unicode_range?: string }} FontFaceInput
 */

/**
 * @param {{ font_family: string; url: string; weight: string; style: string; display: string; unicode_range?: string }} face
 * @returns {string}
 */
export function render_font_face(face) {
	const lines = [
		`  font-family: "${face.font_family}";`,
		`  src: url("${face.url}") format("woff2");`,
		`  font-weight: ${face.weight};`,
		`  font-style: ${face.style};`,
		`  font-display: ${face.display};`
	];
	if (face.unicode_range) {
		lines.push(`  unicode-range: ${face.unicode_range};`);
	}
	return `@font-face {\n${lines.join('\n')}\n}`;
}

/**
 * @param {{ name: string; cssVariable: string; display?: FontDisplay }} family
 * @param {FontFaceInput[]} faces
 * @returns {string}
 */
export function render_family_css(family, faces) {
	const display = family.display ?? 'swap';
	const faces_css = faces
		.map((face) =>
			render_font_face({
				font_family: family.name,
				url: face.url,
				weight: face.weight ?? '400',
				style: face.style ?? 'normal',
				display,
				unicode_range: face.unicode_range
			})
		)
		.join('\n');

	return `${faces_css}\n:root { ${family.cssVariable}: "${family.name}", sans-serif; }`;
}

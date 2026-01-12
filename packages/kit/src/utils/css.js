/**
 * Vite's static asset handling for the client changes the asset URLs in a CSS
 * file to start with `./`. This is incorrect if we're inlining the CSS or if
 * `paths.assets` is set. This function helps us rewrite the URLs in the CSS.
 * @param {string} contents
 * @param {string} base
 * @returns {string}
 */
export function replace_css_relative_url(contents, base) {
	return contents.replaceAll(/url\(\s*(['"]?)\.\//gi, `url($1${base}/`);
}

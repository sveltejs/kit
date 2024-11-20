/**
 * Extracts the redirect source from each line of a [_redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
 * file so we can exclude them in [_routes.json](https://developers.cloudflare.com/pages/functions/routing/#create-a-_routesjson-file)
 * to ensure the redirect is invoked instead of the Cloudflare Function.
 *
 * @param {string} file_contents
 * @returns {string[]}
 */
export function parse_redirects(file_contents) {
	/** @type {string[]} */
	const redirects = [];

	for (const line of file_contents.split('\n')) {
		const content = line.trim();
		if (!content) continue;

		const [pathname] = line.split(' ');
		// pathnames with placeholders are not supported
		if (!pathname || pathname.includes('/:')) {
			throw new Error(`_redirect rule cannot be excluded by _routes.json: ${line}`);
		}
		redirects.push(pathname);
	}

	return redirects;
}

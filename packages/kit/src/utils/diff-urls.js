export const metaUrl = import.meta.url;

/**
 * Get's the shortest href that gets from `from` to `to`
 *
 * @param {URL} from
 * @param {URL} to
 *
 * @returns {string} The shortest href that gets from `from` to `to`
 */
export function getHrefBetween(from, to) {
	//check if they use the same protocol - If not, we can't do anything
	if (from.protocol !== to.protocol) {
		return to.href;
	}

	//If the credentials are different, inherit the protocol and use the rest of the url
	if (from.password !== to.password || from.username !== to.username) {
		const credentials = [to.username, to.password].filter(Boolean).join(':');
		return '//' + credentials + '@' + to.host + to.pathname + to.search + to.hash;
	}

	// host = hostname + port
	if (from.host !== to.host) {
		//since they have the same protocol, we can omit the protocol
		return '//' + to.host + to.pathname + to.search + to.hash;
	}

	//If the pathnames are different, we need to find the shortest path between them
	const relativePath = getRelativePath(from.pathname, to.pathname);
	const absolutePath = to.pathname;

	// use the shortest path - use absolute path if they are the same length
	const path = absolutePath.length <= relativePath.length ? absolutePath : relativePath;
	return path + to.search + to.hash;
}

/**
 * Get's the relative path from the "from" pathname to the "to" pathname.
 *
 * @param {string} from Pathname to start from
 * @param {string} to Pathname to end at
 * @returns {string} The relative path from "from" to "to"
 */
function getRelativePath(from, to) {
	//If the pathnames are identical, we can just return an empty string
	if (from === to) return '';

	const fromPath = from.split('/').filter(Boolean);
	const toPath = to.split('/').filter(Boolean);

	const commonStartSegments = [];
	for (let i = 0; i < fromPath.length; i++) {
		if (fromPath[i] !== toPath[i]) break;
		commonStartSegments.push(fromPath[i]);
	}

	/** The number of ".."s needed to reach common ground */
	const backtracks = Math.max(fromPath.length - commonStartSegments.length - 1, 0);
	const differentEndSegments = toPath.slice(commonStartSegments.length, toPath.length);
	const relativePathSegments = [...new Array(backtracks).fill('..'), ...differentEndSegments];

	return relativePathSegments.join('/') || '.';
}

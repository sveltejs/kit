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

	//If the credentials are included, we always need to include them - so there is no point in diffing further
	if (to.password || to.username) {
		const credentials = [to.username, to.password].filter(Boolean).join(':');
		return '//' + credentials + '@' + to.host + to.pathname + to.search + to.hash;
	}

	// host = hostname + port
	if (from.host !== to.host) {
		//since they have the same protocol, we can omit the protocol
		return '//' + to.host + to.pathname + to.search + to.hash;
	}
	
	return to.pathname + to.search + to.hash;
}


function getUserAgentText() {
	if (typeof navigator === 'undefined') {
		return 'navigator is undefined (running in Node.js?)';
	}

	return `navigator.userAgent = ${navigator.userAgent}`;
}

export function load() {
	return { userAgentText: getUserAgentText() };
}

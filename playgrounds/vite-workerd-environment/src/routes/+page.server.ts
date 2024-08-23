import type { Actions } from './$types';

function getUserAgentText(): string {
	if (typeof navigator === 'undefined') {
		return 'navigator is undefined (running in Node.js?)';
	} else {
		const userAgent = navigator.userAgent;
		return `navigator.userAgent = ${userAgent}`;
	}
}

export function load() {
	return { userAgentText: getUserAgentText() };
}

export const actions = {
	default: () => {
		console.log('\x1b[32m no-op action \x1b[0m');
	}
} satisfies Actions;
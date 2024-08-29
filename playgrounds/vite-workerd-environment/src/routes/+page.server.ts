import type { Actions, PageServerLoadEvent } from './$types';

function getUserAgentText(): string {
	if (typeof navigator === 'undefined') {
		return 'navigator is undefined (running in Node.js?)';
	}

	return `navigator.userAgent = ${navigator.userAgent}`;
}

const KEY = '__my-key__';

export async function load({ platform }: PageServerLoadEvent) {
	const { MY_KV } = platform.env;
	const value = await MY_KV.get(KEY);

	return { userAgentText: getUserAgentText(), value: value === 'null' ? null : value };
}

export const actions = {
	create: async ({ request, platform }) => {
		const { MY_KV } = platform.env;
		const formData = await request.formData();
		const value = formData.get('value') as string;
		await MY_KV.put(KEY, value);

		return null;
	},
	delete: async ({ platform }) => {
		const { MY_KV } = platform.env;
		await MY_KV.delete(KEY);

		return null;
	}
} satisfies Actions;

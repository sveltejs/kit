import { addCacheTag } from '@vercel/functions';

export const trailingSlash = 'always';

export const config = {
	isr: {
		expiration: 60
	}
};

export async function load() {
	await addCacheTag('isr-trailing-slash');

	return {
		rendered_at: Date.now()
	};
}

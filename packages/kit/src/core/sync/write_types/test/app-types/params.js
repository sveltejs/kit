import { defineParams } from '@sveltejs/kit';

export const params = defineParams({
	locale: (param) => {
		if (!['en', 'nb'].includes(param)) return;
		return /** @type {'en' | 'nb'} */ (param);
	}
});

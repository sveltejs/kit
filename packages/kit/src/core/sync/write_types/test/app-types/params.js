import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	locale: (param) => {
		if (!['en', 'nb'].includes(param)) return;
		return /** @type {'en' | 'nb'} */ (param);
	}
});

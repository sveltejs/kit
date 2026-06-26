import { defineParams } from '@sveltejs/kit';

export const params = defineParams({
	/**
	 * @param {string} param
	 * @returns {'en' | 'nb'}
	 */
	locale: (param) => {
		if (!['en', 'nb'].includes(param)) throw new Error('Invalid locale');
		return /** @type {'en' | 'nb'} */ (param);
	}
});

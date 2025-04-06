import type { Embed, PageLoad } from './$types';

export const embed: Embed = (event) => {
	const target = event.url.searchParams.get('target');
	if (target) {
		return {
			target
		};
	}

	return null;
};

export const load: PageLoad = () => {
	return {
		counter: 10
	};
};

import { hydrated } from '$app/environment';

export const load = () => {
	console.log(`hydrated layout`, hydrated);
	return {};
};

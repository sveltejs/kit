import { hydrated } from '$app/environment';

export const load = () => {
	console.log(`hydrated b`, hydrated);
	return {};
};

import { hydrated } from '$app/environment';

export const load = () => {
	console.log(`hydrated a`, hydrated);
	return {};
};

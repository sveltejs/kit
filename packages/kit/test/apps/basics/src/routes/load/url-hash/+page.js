// TODO: remove this when Svelte 5 hydration is fixed. See https://github.com/sveltejs/svelte/issues/14437
export const ssr = false;

export const load = ({ url }) => {
	const hash = url.hash;
	return { hash };
};

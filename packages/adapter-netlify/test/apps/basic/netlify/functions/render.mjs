export { default } from '../../.netlify/functions-internal/sveltekit-render.mjs';

export const config = {
	path: '/*',
	excludedPath: '/.netlify/*',
	preferStatic: true
};

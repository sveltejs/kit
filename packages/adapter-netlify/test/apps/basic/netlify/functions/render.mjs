export { default } from '../../.netlify/v1/functions/sveltekit-render.mjs';

export const config = {
	path: '/*',
	excludedPath: '/.netlify/*',
	preferStatic: true
};

import type { Picture } from 'vite-imagetools';

declare module '*?enhanced' {
	const value: Picture;
	export default value;
}

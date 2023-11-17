/**
 * https://vercel.com/docs/concepts/image-optimization
 */
export default function loader(
	src: string,
	width: number,
	loader_options: any,
	image_options?: { quality?: number }
): string;

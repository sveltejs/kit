/**
 * https://vercel.com/docs/concepts/image-optimization
 */
export default function loader(
	src: string,
	width: number,
	loader_options: { domain: string[] },
	image_options?: { quality: number }
): string;

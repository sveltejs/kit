/**
 * https://vercel.com/docs/concepts/image-optimization
 */
export default function loader(
	src: string,
	width: number,
	loader_options: { domains: string[] },
	image_options?: { quality?: number }
): string;

/**
 * https://vercel.com/docs/concepts/image-optimization
 */
export interface LoaderOptions {
	domains?: string[];
	remotePatterns?: RemotePattern[];
	minimumCacheTTL?: number;
	formats?: ImageFormat[];
	dangerouslyAllowSVG?: boolean;
	contentSecurityPolicy?: string;
	contentDispositionType?: string;
}

type ImageFormat = 'image/avif' | 'image/webp';

type RemotePattern = {
	protocol?: 'http' | 'https';
	hostname: string;
	port?: string;
	pathname?: string;
};

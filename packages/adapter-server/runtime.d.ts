/**
 * Picks the precompressed variant of a file to respond with, from the `Accept-Encoding`
 * request header and the variants that exist. Brotli wins a tie.
 *
 * @returns the variant's file extension, or `undefined` for the uncompressed file
 */
export function negotiateEncoding(
	header: string | null | undefined,
	variants: { br?: unknown; gz?: unknown }
): 'br' | 'gz' | undefined;

/**
 * The client address that a trusted proxy put in the header named by `ADDRESS_HEADER`.
 * For `x-forwarded-for`, it is the address `XFF_DEPTH` places from the right.
 */
export function forwardedAddress(options: {
	/** The lowercased name of the header */
	header: string;
	/** The value of the header on this request */
	value: string | null | undefined;
	/** The value of `XFF_DEPTH` */
	depth: number;
	/** The adapter's `envPrefix`, which error messages name the variables with */
	envPrefix: string;
}): string;

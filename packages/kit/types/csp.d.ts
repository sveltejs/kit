/**
 * Based on https://github.com/josh-hemphill/csp-typed-directives/blob/latest/src/csp.types.ts
 *
 * MIT License
 *
 * Copyright (c) 2021-present, Joshua Hemphill
 * Copyright (c) 2021, Tecnico Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
type SchemeSource = 'http:' | 'https:' | 'data:' | 'mediastream:' | 'blob:' | 'filesystem:';

type HostProtocolSchemes = `${string}://` | '';
type PortScheme = `:${number}` | '' | ':*';
/** Can actually be any string, but typed more explicitly to
 *  restrict the combined optional types of Source from collapsing to just bing `string` */
type HostNameScheme = `${string}.${string}` | `localhost`;
type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;

type CryptoSource = `${'nonce' | 'sha256' | 'sha384' | 'sha512'}-${string}`;

type BaseSource = 'self' | 'unsafe-eval' | 'unsafe-hashes' | 'unsafe-inline' | 'none';

export type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
type Sources = Source[];

type ActionSource = 'strict-dynamic' | 'report-sample';

type FrameSource = HostSource | SchemeSource | 'self' | 'none';

type HttpDelineator = '/' | '?' | '#' | '\\';
type UriPath = `${HttpDelineator}${string}`;

export type CspDirectives = {
	'child-src'?: Sources;
	'default-src'?: Array<Source | ActionSource>;
	'frame-src'?: Sources;
	'worker-src'?: Sources;
	'connect-src'?: Sources;
	'font-src'?: Sources;
	'img-src'?: Sources;
	'manifest-src'?: Sources;
	'media-src'?: Sources;
	'object-src'?: Sources;
	'prefetch-src'?: Sources;
	'script-src'?: Array<Source | ActionSource>;
	'script-src-elem'?: Sources;
	'script-src-attr'?: Sources;
	'style-src'?: Array<Source | ActionSource>;
	'style-src-elem'?: Sources;
	'style-src-attr'?: Sources;
	'base-uri'?: Array<Source | ActionSource>;
	sandbox?: Array<
		| 'allow-downloads-without-user-activation'
		| 'allow-forms'
		| 'allow-modals'
		| 'allow-orientation-lock'
		| 'allow-pointer-lock'
		| 'allow-popups'
		| 'allow-popups-to-escape-sandbox'
		| 'allow-presentation'
		| 'allow-same-origin'
		| 'allow-scripts'
		| 'allow-storage-access-by-user-activation'
		| 'allow-top-navigation'
		| 'allow-top-navigation-by-user-activation'
	>;
	'form-action'?: Array<Source | ActionSource>;
	'frame-ancestors'?: Array<HostSource | SchemeSource | FrameSource>;
	'navigate-to'?: Array<Source | ActionSource>;
	'report-uri'?: UriPath[];
	'report-to'?: string[];

	'require-trusted-types-for'?: Array<'script'>;
	'trusted-types'?: Array<'none' | 'allow-duplicates' | '*' | string>;
	'upgrade-insecure-requests'?: boolean;

	/** @deprecated */
	'require-sri-for'?: Array<'script' | 'style' | 'script style'>;

	/** @deprecated */
	'block-all-mixed-content'?: boolean;

	/** @deprecated */
	'plugin-types'?: Array<`${string}/${string}` | 'none'>;

	/** @deprecated */
	referrer?: Array<
		| 'no-referrer'
		| 'no-referrer-when-downgrade'
		| 'origin'
		| 'origin-when-cross-origin'
		| 'same-origin'
		| 'strict-origin'
		| 'strict-origin-when-cross-origin'
		| 'unsafe-url'
		| 'none'
	>;
};

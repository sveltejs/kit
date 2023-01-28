import { CookieSerializeOptions } from 'cookie';
import { SSRNode, CspDirectives } from 'types';

export interface Fetched {
	url: string;
	method: string;
	request_body?: string | ArrayBufferView | null;
	request_headers?: HeadersInit | undefined;
	response_body: string;
	response: Response;
}

export type Loaded = {
	node: SSRNode;
	data: Record<string, any> | null;
	server_data: any;
};

type CspMode = 'hash' | 'nonce' | 'auto';

export interface CspConfig {
	mode: CspMode;
	directives: CspDirectives;
	reportOnly: CspDirectives;
}

export interface CspOpts {
	prerender: boolean;
}

export interface Cookie {
	name: string;
	value: string;
	options: CookieSerializeOptions;
}

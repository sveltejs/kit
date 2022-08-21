import { ResponseHeaders, SSRNode, CspDirectives } from 'types';
import { HttpError } from '../../../index/private';

export interface Fetched {
	url: string;
	body?: string | null;
	response: {
		status: number;
		statusText: string;
		headers: ResponseHeaders;
		body: string;
	};
}

export interface FetchState {
	fetched: Fetched[];
	cookies: string[];
	new_cookies: string[];
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
	dev: boolean;
	prerender: boolean;
}

export interface SerializedHttpError extends Pick<HttpError, 'message' | 'status'> {
	name: 'HttpError';
	stack: '';
	__is_http_error: true;
}

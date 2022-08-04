import { JSONValue, ResponseHeaders, SSRNode, CspDirectives } from 'types';

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
	data: Record<string, any>;
	server_data: JSONValue;
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

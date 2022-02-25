import { JSONValue, NormalizedLoadOutput, ResponseHeaders, SSRNode } from 'types';

export type Fetched = {
	url: string;
	body?: string | null;
	response: {
		status: number;
		statusText: string;
		headers: ResponseHeaders;
		body: string;
	};
};

export type Loaded = {
	node: SSRNode;
	props: JSONValue | undefined;
	loaded: NormalizedLoadOutput;
	stuff: Record<string, any>;
	fetched: Fetched[];
	set_cookie_headers: string[];
	uses_credentials: boolean;
};

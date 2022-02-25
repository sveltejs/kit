import { JSONValue, NormalizedLoadOutput, SSRNode } from 'types';

export type Loaded = {
	node: SSRNode;
	props: JSONValue | undefined;
	loaded: NormalizedLoadOutput;
	stuff: Record<string, any>;
	fetched: Array<{ url: string; body: string; json: JSONValue }>;
	set_cookie_headers: string[];
	uses_credentials: boolean;
};

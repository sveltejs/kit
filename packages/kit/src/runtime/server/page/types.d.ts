import { JSONValue, NormalizedLoadOutput, SSRNode } from 'types';

export type Loaded = {
	node: SSRNode;
	props: JSONValue | undefined;
	loaded: NormalizedLoadOutput;
	stuff: Record<string, any>;
	fetched: Array<{ url: string; body: string; json: string }>;
	set_cookie_headers: string[];
	uses_credentials: boolean;
};

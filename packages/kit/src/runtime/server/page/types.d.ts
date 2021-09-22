import { NormalizedLoadOutput, SSRNode } from 'types/internal';

export type Loaded = {
	node: SSRNode;
	loaded: NormalizedLoadOutput;
	stuff: Record<string, any>;
	fetched: Array<{ url: string; body: string; json: string }>;
	set_cookie_headers: string[];
	uses_credentials: boolean;
};

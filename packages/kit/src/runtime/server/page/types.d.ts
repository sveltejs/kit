import { NormalizedLoadOutput, SSRNode } from 'types/internal';

export type Loaded = {
	node: SSRNode;
	loaded: NormalizedLoadOutput;
	context: Record<string, any>;
	fetched: Array<{ url: string; body: string; json: string }>;
	uses_credentials: boolean;
};

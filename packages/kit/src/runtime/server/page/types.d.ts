import { LoadOutput, SSRNode } from 'types.internal';

export type Loaded = {
	node: SSRNode;
	loaded: LoadOutput;
	fetched: Array<{ url: string; json: string }>;
	uses_credentials: boolean;
};

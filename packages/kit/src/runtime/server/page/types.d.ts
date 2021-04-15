import { LoadOutput } from '../../../../types/client';
import { SSRNode } from '../../../../types/internal';

export type Loaded = {
	node: SSRNode;
	loaded: LoadOutput;
	context: Record<string, any>;
	fetched: Array<{ url: string; json: string }>;
	uses_credentials: boolean;
};

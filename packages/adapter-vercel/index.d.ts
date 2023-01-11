import { Adapter } from '@sveltejs/kit';

type ServerlessFunctionConfig = {
	memory?: number;
	maxDuration?: number;
	regions?: string[];
};

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
	serverlessFunctionConfig?: ServerlessFunctionConfig;
};

export default function plugin(options?: Options): Adapter;

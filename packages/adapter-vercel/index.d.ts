import { Adapter } from '@sveltejs/kit';

type ServerlessFunctionConfig = {
	memory?: number;
	maxDuration?: number;
	regions?: string[];
};

type EdgeFunctionConfig = {
	envVarsInUse?: string[];
	regions?: 'all' | string | string[];
};

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
	serverlessFunctionConfig?: ServerlessFunctionConfig;
	edgeFunctionConfig?: EdgeFunctionConfig;
};

export default function plugin(options?: Options): Adapter;

import { Adapter } from '@sveltejs/kit';

type Options = {
	defaultConfig?: Config;
	external?: string[];
	split?: boolean;
};

export default function plugin(options?: Options): Adapter;

export interface ServerlessConfig {
	/**
	 * Whether to use [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions) or [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
	 * @default 'nodejs18.x'
	 */
	runtime?: 'nodejs16.x' | 'nodejs18.x';
	/**
	 * To which regions to deploy the app. A list of regions.
	 * More info: https://vercel.com/docs/concepts/edge-network/regions
	 */
	regions?: string[];
	/**
	 * Maximum execution duration (in seconds) that will be allowed for the Serverless Function.
	 * Serverless only.
	 */
	maxDuration?: number;
	/**
	 * Amount of memory (RAM in MB) that will be allocated to the Serverless Function.
	 * Serverless only.
	 */
	memory?: number;
	/**
	 * If `true`, this route will always be deployed as its own separate function
	 */
	split?: boolean;
}

export interface EdgeConfig {
	/**
	 * Whether to use [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions) or [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
	 */
	runtime?: 'edge';
	/**
	 * To which regions to deploy the app. A list of regions or `'all'`.
	 * More info: https://vercel.com/docs/concepts/edge-network/regions
	 */
	regions?: string[] | 'all';
	/**
	 * List of environment variable names that will be available for the Edge Function to utilize.
	 * Edge only.
	 */
	envVarsInUse?: string[];
	/**
	 * If `true`, this route will always be deployed as its own separate function
	 */
	split?: boolean;
}

export type Config = EdgeConfig | ServerlessConfig;

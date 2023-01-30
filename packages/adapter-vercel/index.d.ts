import { Adapter } from '@sveltejs/kit';

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
};

export default function plugin(options?: Options): Adapter;

export interface Config {
	/**
	 * To which runtime to deploy the app. Can be one of:
	 * - `edge`: https://vercel.com/docs/concepts/functions/edge-functions
	 * - `serverless` or a string specifying the serverless runtime (like `node16`): https://vercel.com/docs/concepts/functions/serverless-functions
	 * @default 'serverless'
	 */
	runtime?: 'serverless' | 'edge' | (string & {});
	/**
	 * To which regions to deploy the app. A list of regions or `'all'` for edge functions.
	 * More info: https://vercel.com/docs/concepts/edge-network/regions
	 */
	regions?: string[] | 'all';
	/**
	 * List of environment variable names that will be available for the Edge Function to utilize.
	 * Edge only.
	 */
	envVarsInUse?: string[];
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
}

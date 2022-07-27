import { Adapter } from '@sveltejs/kit';

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
	local_config_filename?: string;
};

export default function plugin(options?: Options): Adapter;

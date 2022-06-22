import { Adapter } from '@sveltejs/kit';

type Options = {
	edge?: boolean;
	external?: string[];
	split?: boolean;
};

export default function plugin(options?: Options): Adapter;

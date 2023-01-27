import { Adapter } from '@sveltejs/kit';

type Options = {
	edge?: boolean;
	split?: boolean;
};

export default function plugin(options?: Options): Adapter;

import { query } from '$app/server';

const one = query(() => 1);
const two = query(() => 2);

export const total = query(async () => {
	return (await one()) + (await two());
});

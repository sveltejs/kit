import { match } from '$app/paths';
import { query } from '$app/server';
import * as v from 'valibot';

const schema = v.union([v.string(), v.instance(URL)]);

export const match_route = query(schema, async (href) => {
	return await match(href);
});

export const match_routes = query.batch(schema, async (hrefs) => {
	const results = await Promise.all(hrefs.map((href) => match_route(href)));
	return (_, i) => results[i];
});

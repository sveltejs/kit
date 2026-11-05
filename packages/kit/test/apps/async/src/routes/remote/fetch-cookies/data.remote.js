import { command, form, getRequestEvent, prerender, query } from '$app/server';

async function fetch_cookies() {
	const { fetch, cookies } = getRequestEvent();
	const response = await fetch('/remote/fetch-cookies/set-cookie?relay');
	return `${await response.text()}: ${cookies.get('injected') ?? 'unset'}`;
}

export const read = query(fetch_cookies);
export const read_batch = query.batch('unchecked', async () => {
	const result = await fetch_cookies();
	return () => result;
});
export const read_live = query.live(async function* () {
	yield await fetch_cookies();
});
export const read_prerender = prerender('unchecked', fetch_cookies, { dynamic: true });
export const mutate = command(fetch_cookies);
export const submit = form(fetch_cookies);

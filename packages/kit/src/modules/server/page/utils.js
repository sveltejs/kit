/** @param {URL} url */
export function create_prerendering_url_proxy(url) {
	return new Proxy(url, {
		get: (target, prop, receiver) => {
			if (prop === 'search' || prop === 'searchParams') {
				throw new Error(`Cannot access url.${prop} on a page with prerendering enabled`);
			}
			return Reflect.get(target, prop, receiver);
		}
	});
}

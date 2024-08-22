export default {
	fetch: () => {
		return new Promise((resolve) => resolve(new Response('hello from node environment')));
	}
};

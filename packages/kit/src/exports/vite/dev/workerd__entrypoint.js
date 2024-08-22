export default {
	fetch: () => {
		return new Promise((resolve) => resolve(new Response('Hello from workerd')));
	}
};

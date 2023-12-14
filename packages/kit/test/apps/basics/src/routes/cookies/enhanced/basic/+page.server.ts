export const load: import('./$types').PageServerLoad = (event) => {
	const cookie = event.cookies.get('a');
	return { cookie };
};

export const actions: import('./$types').Actions = {
	setTeapot: (event) => {
		event.cookies.set('a', 'teapot', { path: '' });
		return { lastSet: new Date().valueOf() };
	},
	setJaneAusten: (event) => {
		event.cookies.set('a', 'Jane Austen', { path: '' });
		return { lastSet: new Date().valueOf() };
	},
	delete: (event) => {
		event.cookies.delete('a', { path: '' });
		return { lastSet: new Date().valueOf() };
	}
};

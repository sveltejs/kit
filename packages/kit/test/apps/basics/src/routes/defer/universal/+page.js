import { defer } from '@sveltejs/kit';

export function load() {
	return defer({
		eager: 'eager',
		success: new Promise((resolve) => {
			setTimeout(() => {
				resolve('success');
			}, 1000);
		}),
		fail: new Promise((_, reject) => {
			setTimeout(() => {
				reject('fail');
			}, 1000);
		})
	});
}

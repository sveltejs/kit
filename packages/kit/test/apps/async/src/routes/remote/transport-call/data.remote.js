import { command, query } from '$app/server';
import { Foo } from '#lib';

export const get_foo = query(() => new Foo('query'));

export const make_foo = command(() => {
	// the refreshed query travels back with the command's response
	void get_foo().refresh();
	return new Foo('command');
});

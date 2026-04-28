export function load() {
	return {
		foo: 'bar'
	};
}

export const actions = {
	default: () => ({ action: 'bar' })
};

/** @type {import('./.svelte-kit/types/$types').PageData} */
const data = {
	foo: 'asd'
};
data.foo;
// @ts-expect-error
data.bar;

/** @type {import('./.svelte-kit/types/$types').ActionData} */
const actionData = { action: 'bar' };
actionData.action;
// @ts-expect-error
actionData.foo;

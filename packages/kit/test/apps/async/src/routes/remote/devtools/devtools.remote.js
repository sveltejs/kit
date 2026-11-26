import { command, getRequestEvent, query } from '$app/server';

/**
 * per browser session so parallel tests do not share todos
 * @type {Map<string, string[]>}
 */
const sessions = new Map();

function todos() {
	const id = getRequestEvent().cookies.get('session') ?? 'default';
	if (!sessions.has(id)) sessions.set(id, ['Buy groceries']);
	return /** @type {string[]} */ (sessions.get(id));
}

export const get_todos = query(() => todos());

export const add_todo = command('unchecked', async (/** @type {string} */ title) => {
	todos().push(title);
	await get_todos().refresh();
	return todos().length;
});

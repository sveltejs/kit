/*
	This module is used by the /todos endpoint to
	make calls to api.svelte.dev, which stores todos
	for each user. The leading underscore indicates that this is
	a private module, _not_ an endpoint — visiting /todos/_api
	will net you a 404 response.
	(The data on the todo app will expire periodically; no
	guarantees are made. Don't use it to organise your life.)
*/
import type { ITodoManager } from '$lib/todo/interface';

class TodoManager implements ITodoManager {
	async get(userid: string): Promise<Todo[]> {
		const response = await this.call_api('get', `todos/${userid}`);
		const status = response.status;
		if (status === 404) return [];
		if (status === 200) return await response.json();
		return Promise.reject(response.status);
	}

	async post(userid: string, todo: Todo): Promise<void> {
		const response = await this.call_api('post', `todos/${userid}`, {
			text: todo.text
		});
		const status = response.status;
		if (400 <= status) return Promise.reject(status);
	}

	async patch(
		userid: string,
		uid: Todo['uid'],
		todo: { done?: Todo['done']; text?: Todo['text'] }
	): Promise<void> {
		const response = await this.call_api('patch', `todos/${userid}/${uid}`, {
			text: todo.text,
			done: todo.done
		});
		const status = response.status;
		if (400 <= status) return Promise.reject(status);
	}

	async delete(userid: string, uid: string): Promise<void> {
		const response = await this.call_api('delete', `todos/${userid}/${uid}`);
		const status = response.status;
		if (400 <= status) return Promise.reject(status);
	}

	private base_path = 'https://api.svelte.dev';
	private call_api(method: string, resource: string, data?: Record<string, unknown>) {
		return fetch(`${this.base_path}/${resource}`, {
			method,
			headers: {
				'content-type': 'application/json'
			},
			body: data && JSON.stringify(data)
		});
	}
}

const todoManager = new TodoManager();
export default todoManager;

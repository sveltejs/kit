// --------------------------------------------------
// In a real app, you would probably want to use a real database or an external API.
// For simplicity's sake, we will just use an in-memory Map here.
// --------------------------------------------------
import type { ITodoManager } from '$lib/todo/interface';

class TodoManager implements ITodoManager {
	private user_to_todos: Map<string, Todo[]> = new Map();

	async get(userid: string): Promise<Todo[]> {
		return this.user_to_todos.get(userid) ?? [];
	}

	async post(userid: string, todo: Todo): Promise<void> {
		if (!this.user_to_todos.has(userid)) this.user_to_todos.set(userid, []);
		this.user_to_todos.get(userid)?.push(todo);
	}

	async patch(
		userid: string,
		uid: Todo['uid'],
		todo: { done?: Todo['done']; text?: Todo['text'] }
	): Promise<void> {
		const todos = this.user_to_todos.get(userid);
		const index = todos?.findIndex((t) => t.uid === uid);
		if (!todos || index === -1) return Promise.reject(404);

		const existing = todos[index];
		todos[index] = {
			...existing,
			text: todo.text ?? existing.text,
			done: todo.done ?? existing.done
		};
	}

	async delete(userid: string, uid: string): Promise<void> {
		const todos = this.user_to_todos.get(userid);
		const index = todos?.findIndex((t) => t.uid === uid);
		if (todos === void 0 || index === -1) return Promise.reject(404);
		todos.splice(index, 1);
	}
}

const todoManager = new TodoManager();
export default todoManager;

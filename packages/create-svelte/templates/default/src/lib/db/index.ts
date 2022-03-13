// --------------------------------------------------
// In a real app, you would probably want to use a real database or an external API.
// For simplicity's sake, we will just use an in-memory Map here.
// --------------------------------------------------
class Database {
	todos: Map<string, Todo[]>;

	constructor() {
		this.todos = new Map();
	}

	getTodos(userid: string): Todo[] {
		return this.todos.get(userid) ?? [];
	}

	addTodo(userid: string, todo: Todo): void {
		if (!this.todos.has(userid)) {
			this.todos.set(userid, []);
		}
		this.todos.get(userid)?.push(todo);
	}

	updateTodo(
		userid: string,
		todoID: Todo['uid'],
		todo: { done?: Todo['done']; text?: Todo['text'] }
	): void {
		const usersTodos = this.todos.get(userid);
		const index = usersTodos?.findIndex((t) => t.uid === todoID);

		if (usersTodos === void 0 || index === -1) throw new Error('Todo not found');

		const existingTodo = usersTodos[index];

		const updatedTodo = {
			...existingTodo,
			text: todo.text ?? existingTodo.text,
			done: todo.done ?? existingTodo.done
		};
		usersTodos[index] = updatedTodo;
	}

	deleteTodo(userid: string, todoID: string): void {
		const usersTodos = this.todos.get(userid);
		const index = usersTodos?.findIndex((t) => t.uid === todoID);
		if (usersTodos === void 0 || index === -1) throw new Error('Todo not found');

		usersTodos.splice(index, 1);
	}
}

export const database = new Database();

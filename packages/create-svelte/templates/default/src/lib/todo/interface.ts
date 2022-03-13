export interface ITodoManager {
	get(userid: string): Promise<Todo[]>;
	post(userid: string, todo: Todo): Promise<void>;
	patch(
		userid: string,
		uid: Todo['uid'],
		todo: { done?: Todo['done']; text?: Todo['text'] }
	): Promise<void>;
	delete(userid: string, uid: string): Promise<void>;
}

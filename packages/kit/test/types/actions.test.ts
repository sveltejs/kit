import Kit from '@sveltejs/kit';

// Test: Action types inferred correctly and transformed into a union
type Actions = {
	foo: () => Promise<void>;
	bar: () => Promise<{ success: boolean } | Kit.ActionFailure<{ message: string }>>;
};

let form: Kit.AwaitedActions<Actions> = null as any;
form.message = '';
form.success = true;
// @ts-expect-error - cannot both be present at the same time
form = { message: '', success: true };

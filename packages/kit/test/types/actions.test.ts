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

// Test: Actions with different return types are transformed into a union that has all types accessible
type Actions2 = {
	foo: () => Promise<{ message: string }>;
	bar: () => Promise<{ success: boolean }>;
};

let form2: Kit.AwaitedActions<Actions2> = null as any;
form2.message = '';
form2.success = true;
// @ts-expect-error - cannot both be present at the same time
form2 = { message: '', success: true };

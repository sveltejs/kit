import * as Kit from '@sveltejs/kit';

// Test: Action types inferred correctly and transformed into a union
type Actions = {
	foo: () => Promise<void>;
	bar: () => Promise<{ success: boolean } | Kit.ActionFailure<{ message: string }>>;
	baz: () => Kit.ActionFailure<{ foo: string }> | { status: number; data: string };
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

// Test: ActionFailure is correctly infered to be different from the normal return type even if they have the same shape
type Actions3 = {
	bar: () => Kit.ActionFailure<{ foo: string }> | { status: number; data: { bar: string } };
};
let form3: Kit.AwaitedActions<Actions3> = null as any;
form3.foo = '';
form3.status = 200;
// @ts-expect-error - cannot both be present at the same time
form3 = { foo: '', status: 200 };

let foo: any = null;
// @ts-expect-error ActionFailure is not a class and so you can't do instanceof
foo instanceof Kit.ActionFailure;

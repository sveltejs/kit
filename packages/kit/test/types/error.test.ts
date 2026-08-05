import { error, type HandleClientError, type HandleServerError } from '@sveltejs/kit';

const app_error: App.Error = { status: 500, message: 'Unexpected error' };

// @ts-expect-error App.Error requires status
const app_error_without_status: App.Error = { message: 'Unexpected error' };

const handle_error_hooks: [HandleServerError, HandleClientError] = [
	({ kind, error }) => {
		if (kind === 'expected') {
			error satisfies App.Error;
			return error;
		}

		if (kind === 'framework') {
			error satisfies { status: number; message: string };
			return error;
		}

		error satisfies unknown;
		return { message: 'Unexpected error' };
	},
	() => ({ message: 'Unexpected error' })
];

// `status` and `message` are optional in the return — they are only returned to
// override the defaults inherited from the caught error
const handle_error_overrides: [HandleServerError, HandleServerError, HandleClientError] = [
	() => ({}),
	() => ({ status: 404 }),
	() => ({})
];

// with the default `App.Error`, returning nothing is valid — every property of the
// return type is optional, so `void` and `{}` mean the same thing
const handle_error_without_return: [HandleServerError, HandleClientError, HandleServerError] = [
	() => {},
	() => {},
	async () => {}
];

void app_error;
void app_error_without_status;
void handle_error_hooks;
void handle_error_overrides;
void handle_error_without_return;

function a() {
	error(400, 'Bad request');
}

function b() {
	error(400, { message: 'Bad request' });
}

function c() {
	// @ts-expect-error
	error(400, 'Bad request', { cause: new Error('cause') });
}

function d() {
	error(400, { message: 'Bad request' });
}

function e() {
	// @ts-expect-error
	error(400, { message: 'Bad request', cause: new Error('cause') });
}

function f() {
	error(400);
}

a;
b;
c;
d;
e;
f;

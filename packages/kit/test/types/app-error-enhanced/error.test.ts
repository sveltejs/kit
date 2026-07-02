import { error, type HandleClientError, type HandleServerError } from '@sveltejs/kit';

const app_error: App.Error = { status: 500, message: 'Unexpected error', additional: true };

declare global {
	namespace App {
		interface Error {
			additional: boolean;
		}
	}
}

// @ts-expect-error App.Error requires status
const app_error_without_status: App.Error = { message: 'Unexpected error' };

const handle_error_hooks: [
	HandleServerError,
	HandleServerError,
	HandleClientError,
	HandleClientError
] = [
	() => ({ message: 'Unexpected error', additional: true }),
	// @ts-expect-error App.Error requires additional
	() => ({ message: 'Unexpected error' }),
	() => ({ message: 'Unexpected error', additional: true }),
	// @ts-expect-error App.Error requires
	() => ({ message: 'Unexpected error' })
];

void app_error;
void app_error_without_status;
void handle_error_hooks;

function a() {
	// @ts-expect-error App.Error requires additional
	error(400, 'Bad request');
}

function b() {
	// @ts-expect-error App.Error requires additional
	error(400, { message: 'Bad request' });
}

function c() {
	error(400, 'Bad request', { additional: true });
}

function d() {
	// @ts-expect-error
	error(400, { message: 'Bad request' });
}

function e() {
	error(400, { message: 'Bad request', additional: true });
}

function f() {
	// @ts-expect-error
	error(400);
}

a;
b;
c;
d;
e;
f;

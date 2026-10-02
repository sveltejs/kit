import { error, type HandleClientError, type HandleServerError } from '@sveltejs/kit';

const app_error: App.Error = { status: 500, message: 'Unexpected error' };

// @ts-expect-error App.Error requires status
const app_error_without_status: App.Error = { message: 'Unexpected error' };

const handle_error_hooks: [HandleServerError, HandleClientError] = [
	() => ({ message: 'Unexpected error' }),
	() => ({ message: 'Unexpected error' })
];

void app_error;
void app_error_without_status;
void handle_error_hooks;

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

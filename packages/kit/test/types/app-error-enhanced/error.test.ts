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

// `status` and `message` are optional in the return (they default to those of the
// caught error), but augmented properties of `App.Error` remain required
const handle_error_overrides: [HandleServerError, HandleClientError] = [
	() => ({ additional: true }),
	() => ({ additional: true })
];

const handle_error_kinds: HandleServerError = ({ kind, error }) => {
	if (kind === 'expected') {
		error satisfies App.Error;
		return error;
	}

	if (kind === 'framework' || kind === 'validation') {
		// @ts-expect-error framework and validation errors have no `additional` property
		error satisfies App.Error;
		return { ...error, additional: true };
	}

	return { additional: true };
};

// `App.Error` is augmented with a REQUIRED `additional` property, so unlike the default
// case the hook cannot return nothing — it must supply the augmented properties
const handle_error_without_return: [HandleServerError, HandleClientError] = [
	// @ts-expect-error handleError must return the required properties of App.Error
	() => {},
	// @ts-expect-error handleError must return the required properties of App.Error
	() => {}
];

void app_error;
void app_error_without_status;
void handle_error_hooks;
void handle_error_overrides;
void handle_error_kinds;
void handle_error_without_return;

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

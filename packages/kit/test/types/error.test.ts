import { error, type HandleClientError, type HandleServerError } from '@sveltejs/kit';
import type { StandardSchemaV1 } from '@standard-schema/spec';

const app_error: App.Error = { status: 500, message: 'Unexpected error' };

// @ts-expect-error App.Error requires status
const app_error_without_status: App.Error = { message: 'Unexpected error' };

const handle_error_hooks: [HandleServerError, HandleClientError] = [
	({ kind, error, issues }) => {
		if (kind === 'app') {
			error satisfies App.Error;
			issues satisfies undefined;
			return error;
		}

		if (kind === 'framework') {
			error satisfies { status: number; message: string };
			issues satisfies undefined;
			return error;
		}

		if (kind === 'validation') {
			error satisfies { status: number; message: string };
			issues satisfies Array<import('@standard-schema/spec').StandardSchemaV1.Issue>;
			return error;
		}

		error satisfies unknown;
		issues satisfies undefined;
		return { message: 'Unexpected error' };
	},
	() => ({ message: 'Unexpected error' })
];

// `status` and `message` are optional in the return — they are only returned to
// override the defaults inherited from the caught error
interface CustomIssue extends StandardSchemaV1.Issue {
	code: string;
}

const handle_custom_validation_error: HandleServerError<CustomIssue> = ({ kind, issues }) => {
	if (kind === 'validation') {
		issues[0].code satisfies string;
	}
};

const handle_client_error: HandleClientError = ({ kind }) => {
	// @ts-expect-error validation errors are handled on the server
	kind satisfies 'validation';
};

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
void handle_custom_validation_error;
void handle_client_error;
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

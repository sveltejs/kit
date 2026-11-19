import * as devalue from 'devalue';
import { flushSync, tick } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import { reset_remote_state, set_remote_env } from '@sveltejs/kit/internal/client';

const env = vi.hoisted(() => ({ DEV: true }));
vi.mock('esm-env', () => ({
	BROWSER: true,
	get DEV() {
		return env.DEV;
	}
}));
beforeEach(() => {
	env.DEV = true;
});

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery. Creating form instances needs none of it.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	query_responses: {},
	set_nearest_error_page: () => {}
}));

const { form } = await import('./form.svelte.js');

/** @param {Omit<ReturnType<typeof form>, 'for'>} instance */
function attach(instance) {
	const element = document.createElement('form');
	const attachment = Reflect.ownKeys(instance).find((key) => typeof key === 'symbol');
	return {
		element,
		attach: () => /** @type {any} */ (instance)[/** @type {symbol} */ (attachment)](element)
	};
}

test.each([undefined, 'key', 0, false, ''])(
	'a form instance with key %s cannot attach twice',
	(key) => {
		const remote = form('hash/myForm');
		const instance = key === undefined ? remote : remote.for(/** @type {string | number} */ (key));
		const first = attach(instance);
		const second = attach(instance);
		const cleanup = first.attach();
		try {
			expect(() => second.attach()).toThrowKitError('remote_form_multiple_elements');
			expect(instance.element).toBe(first.element);
		} finally {
			cleanup();
		}
		const detach = second.attach();
		expect(instance.element).toBe(second.element);
		detach();
	}
);

test('distinct keyed form instances can attach independently', () => {
	const remote = form('hash/myForm');
	const first = attach(remote.for('first'));
	const second = attach(remote.for('second'));
	const detach_first = first.attach();
	const detach_second = second.attach();
	detach_first();
	detach_second();
});

test('submit throws synchronously before attachment', () => {
	const remote = form('hash/myForm');
	expect(() => remote.submit()).toThrowKitError('remote_form_not_attached');
	expect(remote.pending).toBe(0);
});

test('submission reuses file enctype guidance and rejects the reserved field name', () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	const input = document.createElement('input');
	input.type = 'file';
	input.name = remote.fields.file.as('file').name;
	element.append(input);
	const detach = mount();
	try {
		expect(() => remote.submit()).toThrowKitError('enhance_file_without_enctype');
		input.type = 'text';
		input.name = '$/hash/myForm';
		expect(() => remote.submit()).toThrowKitError('remote_form_reserved_field');
		expect(remote.pending).toBe(0);
	} finally {
		detach();
	}
});

test.each(['mixed', 'multiple'])('file input %s misuse retains its development guard', (kind) => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	const input = document.createElement('input');
	input.type = 'file';
	input.name = remote.fields.files.as(kind === 'mixed' ? 'file multiple' : 'file').name;
	input.multiple = true;
	element.append(input);
	if (kind === 'mixed') {
		const text = document.createElement('input');
		text.name = input.name;
		element.append(text);
	}
	const listeners = vi.spyOn(element, 'addEventListener');
	const detach = mount();
	const handler = /** @type {(event: Event) => void} */ (
		listeners.mock.calls.find(([type]) => type === 'input')?.[1]
	);
	try {
		expect(() => handler(/** @type {any} */ ({ target: input }))).toThrowKitError(
			kind === 'mixed' ? 'remote_form_mixed_inputs' : 'remote_form_multiple_files',
			{ contains: [input.name] }
		);
		env.DEV = false;
		Object.defineProperty(input, 'files', { value: [] });
		expect(() => handler(/** @type {any} */ ({ target: input }))).not.toThrow();
	} finally {
		detach();
		listeners.mockRestore();
	}
});

test('production attachment and submission errors only contain their URLs', () => {
	env.DEV = false;
	const remote = form('hash/myForm');
	expect(() => remote.submit()).toThrowKitError('remote_form_not_attached', { url_only: true });
	const first = attach(remote);
	const detach = first.attach();
	try {
		expect(() => attach(remote).attach()).toThrowKitError('remote_form_multiple_elements', {
			url_only: true
		});
	} finally {
		detach();
	}
});

test('production keeps ignored-issue warnings guarded but emits invoked update warnings', async () => {
	env.DEV = false;
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const remote = form('hash/myForm').preflight({
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: () => ({ issues: [{ message: 'issue' }] })
		}
	});
	const detach = attach(remote).attach();
	try {
		const promise = remote.submit();
		expect(promise.updates()).toBe(promise);
		expect(promise.updates()).toBe(promise);
		await expect(promise).resolves.toBe(false);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toContainKitDiagnostic('remote_updates_repeated', { url_only: true });
	} finally {
		detach();
		warn.mockRestore();
	}
});

test.each(['ignored', 'field', 'all'])(
	'preflight issues are %s without changing issue data',
	async (read) => {
		vi.useFakeTimers();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const issues = [
			{ message: 'User issue', path: ['name'] },
			{ message: 'Whole form issue', path: [] }
		];
		const remote = form('hash/myForm').preflight({
			'~standard': { version: 1, vendor: 'test', validate: () => ({ issues }) }
		});
		const { element, attach: mount } = attach(remote);
		const detach = mount();
		try {
			await expect(remote.submit()).resolves.toBe(false);
			if (read === 'field') expect(remote.fields.name.issues()).toEqual([issues[0]]);
			if (read === 'all') expect(remote.fields.allIssues()).toEqual(issues);
			await vi.runAllTimersAsync();
			if (read === 'all') {
				expect(warn).not.toHaveBeenCalled();
			} else {
				expect(warn).toHaveBeenCalledOnce();
				expect(warn).toContainKitDiagnostic('remote_form_issues_ignored', {
					contains:
						read === 'ignored' ? ['name (User issue)', 'Whole form issue'] : ['Whole form issue']
				});
				expect(warn.mock.calls[0].at(-1)).toBe(element);
				if (read === 'field') expect(warn.mock.calls[0][0]).not.toContain('User issue');
			}
			expect(remote.fields.allIssues()).toEqual(issues);
			expect(remote.pending).toBe(0);
		} finally {
			detach();
			warn.mockRestore();
			vi.useRealTimers();
		}
	}
);

test('form.for keeps its instance when the derived that holds it reconnects', async () => {
	const remote = form('id');
	let connected = $state(true);
	/** @type {unknown} */
	let held;

	const cleanup = $effect.root(() => {
		const instance = $derived(remote.for('key'));

		$effect(() => {
			if (connected) held = instance;
		});
	});

	try {
		flushSync();

		// the derived loses its last reaction, which freezes the effects created inside it
		connected = false;
		flushSync();
		await tick();

		// reading it again reconnects the derived and reruns those effects
		connected = true;
		flushSync();
		await tick();

		expect(remote.for('key') === held).toBe(true);
	} finally {
		cleanup();
	}
});

test('a keyed submission that settles after reset_remote_state keeps the new keyed instance', async () => {
	const slow = Promise.withResolvers();
	const fetch = vi.fn(() => slow.promise);
	set_remote_env({
		fetch,
		page: { url: new URL('http://localhost/') },
		goto: () => Promise.resolve(),
		refresh_all: () => Promise.resolve(),
		handle_error: () => Promise.resolve({ status: 500, message: 'error' })
	});

	const remote = form('hash/keyedPost');

	/** @type {any} */
	let old;
	const destroy_old = $effect.root(() => {
		old = remote.for('x');
	});
	flushSync();

	const { attach: mount } = attach(old);
	const detach = mount();
	const submission = old.submit();
	await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
	detach();
	destroy_old();

	await reset_remote_state();

	/** @type {any} */
	let next;
	const destroy_next = $effect.root(() => {
		next = remote.for('x');
	});
	flushSync();

	try {
		expect(next).not.toBe(old);

		slow.resolve(
			Response.json({ type: 'result', data: devalue.stringify({ _: { result: { id: 1 } } }) })
		);
		await submission;
		await tick();
		await tick();

		expect(remote.for('x')).toBe(next);
	} finally {
		destroy_next();
	}
});

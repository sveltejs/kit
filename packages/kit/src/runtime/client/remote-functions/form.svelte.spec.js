import { flushSync, tick } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

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
	_goto: () => {},
	set_nearest_error_page: () => {},
	handle_error: () => {},
	refreshAll: () => {}
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

test('enhance callback reads field values submitted from the DOM', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	const input = document.createElement('input');
	input.type = 'text';
	input.name = remote.fields.title.as('text').name;
	element.append(input);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const detach = mount();
	// the value reaches the DOM without an input event (programmatic control, autofill,
	// pre-hydration values), so the reactive form state never observes it
	input.value = 'from-dom';
	/** @type {any} */
	let seen;
	remote.enhance((instance) => {
		seen = { value: instance.fields.title.value() };
	});
	try {
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		expect(seen.value).toBe('from-dom');
	} finally {
		detach();
	}
});

test('enhance callback keeps programmatically set values for fields not in the DOM', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const detach = mount();
	// a field with no rendered input keeps the value set through the fields API (#15887 direction)
	remote.fields.hidden_field.set('kept');
	/** @type {any} */
	let seen;
	remote.enhance((instance) => {
		seen = { value: instance.fields.hidden_field.value() };
	});
	try {
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		expect(seen.value).toBe('kept');
	} finally {
		detach();
	}
});

test('field defaults from .as are not reflected in value() before submission', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const input = document.createElement('input');
	input.type = 'text';
	const props = remote.fields.title.as('text', 'the-default');
	input.name = props.name;
	element.append(input);
	const detach = mount();
	try {
		// neither edited nor submitted yet: value() must not reflect the .as default
		expect(remote.fields.title.value()).toBe(undefined);
		// the rendered DOM carries the default, as the spread props would set it
		input.value = 'the-default';
		/** @type {any} */
		let seen;
		remote.enhance((instance) => {
			seen = { value: instance.fields.title.value() };
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		// once submitted, the value is reflected in the callback
		expect(seen.value).toBe('the-default');
	} finally {
		detach();
	}
});

test('a disabled input keeps its programmatically set value through submission', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const input = document.createElement('input');
	input.type = 'text';
	input.name = remote.fields.note.as('text').name;
	input.disabled = true;
	element.append(input);
	const detach = mount();
	try {
		remote.fields.note.set('state-value');
		/** @type {any} */
		let seen;
		remote.enhance((instance) => {
			seen = { value: instance.fields.note.value() };
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		// disabled inputs are excluded from FormData, so the state value must survive
		expect(seen.value).toBe('state-value');
	} finally {
		detach();
	}
});

test('a DOM value changed without an input event overwrites stale state on submission', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const input = document.createElement('input');
	input.type = 'text';
	input.name = remote.fields.title.as('text').name;
	element.append(input);
	const detach = mount();
	try {
		input.value = 'old';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		expect(remote.fields.title.value()).toBe('old');
		// programmatic change, no input event: state is now stale
		input.value = 'new';
		expect(remote.fields.title.value()).toBe('old');
		/** @type {any} */
		let seen;
		remote.enhance((instance) => {
			seen = { value: instance.fields.title.value() };
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		expect(seen.value).toBe('new');
	} finally {
		detach();
	}
});

test('repeated and nested fields reflect the submitted FormData', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const tag_a = document.createElement('input');
	tag_a.type = 'text';
	tag_a.name = 'tags[]/hash/myForm';
	tag_a.value = 'a';
	const tag_b = document.createElement('input');
	tag_b.type = 'text';
	tag_b.name = 'tags[]/hash/myForm';
	tag_b.value = 'b';
	const nested = document.createElement('input');
	nested.type = 'text';
	nested.name = 'profile.name/hash/myForm';
	nested.value = 'nested-val';
	element.append(tag_a, tag_b, nested);
	const detach = mount();
	try {
		/** @type {any} */
		let seen;
		remote.enhance((instance) => {
			seen = {
				tags: instance.fields.tags.value(),
				nested: instance.fields.profile.name.value()
			};
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		expect(seen.tags).toEqual(['a', 'b']);
		expect(seen.nested).toBe('nested-val');
	} finally {
		detach();
	}
});

test('a rejected preflight retains submitted DOM values alongside its issues', async () => {
	const remote = form('hash/myForm').preflight({
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: () => ({ issues: [{ message: 'issue', path: ['title'] }] })
		}
	});
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const input = document.createElement('input');
	input.type = 'text';
	input.name = remote.fields.title.as('text').name;
	input.value = 'from-dom';
	element.append(input);
	const detach = mount();
	try {
		expect(remote.fields.title.value()).toBe(undefined);
		let enhance_ran = false;
		remote.enhance(() => {
			enhance_ran = true;
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (remote.fields.title.issues() === undefined) {
				throw new Error('preflight issues not set yet');
			}
		});
		expect(enhance_ran).toBe(false);
		// Validation does not discard the submitted value, just as an input event
		// updates the model even when the value does not satisfy the schema.
		expect(remote.fields.title.value()).toBe('from-dom');
	} finally {
		detach();
	}
});

test('submitted nested fields merge into existing state without dropping sibling keys', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	const input = document.createElement('input');
	input.type = 'text';
	input.name = 'profile.name/hash/myForm';
	input.value = 'from-dom';
	element.append(input);
	const detach = mount();
	try {
		remote.fields.set({ profile: { name: 'old', city: 'kept' } });
		/** @type {any} */
		let seen;
		remote.enhance((instance) => {
			seen = {
				name: instance.fields.profile.name.value(),
				city: instance.fields.profile.city.value()
			};
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (seen === undefined) throw new Error('callback not run yet');
		});
		// the submitted nested key is updated, the unsubmitted sibling survives
		expect(seen.name).toBe('from-dom');
		expect(seen.city).toBe('kept');
	} finally {
		detach();
	}
});

test('removed array entries are cleared on a later submission', async () => {
	const remote = form('hash/myForm');
	const { element, attach: mount } = attach(remote);
	element.setAttribute('method', 'post');
	element.setAttribute(
		'action',
		'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm')
	);
	/** @param {string} v */
	const tag = (v) => {
		const input = document.createElement('input');
		input.type = 'text';
		input.name = 'tags[]/hash/myForm';
		input.value = v;
		return input;
	};
	const tag_a = tag('a');
	const tag_b = tag('b');
	const tag_c = tag('c');
	element.append(tag_a, tag_b, tag_c);
	const detach = mount();
	try {
		/** @type {any} */
		let seen;
		let runs = 0;
		remote.enhance((instance) => {
			runs++;
			seen = { tags: instance.fields.tags.value() };
		});
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (runs < 1) throw new Error('first callback not run yet');
		});
		expect(seen.tags).toEqual(['a', 'b', 'c']);

		// remove one control and submit again: the submitted set replaces the array
		tag_c.remove();
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			if (runs < 2) throw new Error('second callback not run yet');
		});
		expect(seen.tags).toEqual(['a', 'b']);
	} finally {
		detach();
	}
});

test('async preflight preserves edits made while validation is pending', async () => {
	/** @type {(() => void) | undefined} */
	let finish_preflight;
	const remote = form('hash/myForm').preflight({
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: async (value) => {
				await new Promise((resolve) => {
					finish_preflight = () => resolve(null);
				});
				return { value };
			}
		}
	});
	const { element, attach: mount } = attach(remote);
	element.method = 'post';
	element.action = 'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm');
	const input = document.createElement('input');
	input.name = remote.fields.title.as('text').name;
	input.value = 'submitted';
	element.append(input);
	const detach = mount();
	const enhanced = vi.fn();
	remote.enhance(enhanced);
	try {
		element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => expect(finish_preflight).toBeTypeOf('function'));
		input.value = 'newer edit';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		expect(remote.fields.title.value()).toBe('newer edit');
		finish_preflight?.();
		await vi.waitFor(() => expect(enhanced).toHaveBeenCalledOnce());
		expect(remote.fields.title.value()).toBe('newer edit');
	} finally {
		detach();
	}
});

test.each(['unbound', '__proto__.x/hash/myForm', 'title/hash/myForm'])(
	'invalid field %s does not partially synchronize the model',
	async (invalid_name) => {
		const remote = form('hash/myForm');
		const { element, attach: mount } = attach(remote);
		element.method = 'post';
		element.action = 'http://localhost/?%2Fremote=' + encodeURIComponent('hash/myForm');
		const title = document.createElement('input');
		title.name = remote.fields.title.as('text').name;
		title.value = 'from-dom';
		const invalid = document.createElement('input');
		invalid.name = invalid_name;
		invalid.value = 'invalid';
		element.append(title, invalid);
		const detach = mount();
		const enhanced = vi.fn();
		remote.enhance(enhanced);
		try {
			remote.fields.title.set('state-value');
			element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			await vi.waitFor(() => expect(remote.pending).toBe(0));
			expect(enhanced).not.toHaveBeenCalled();
			expect(remote.fields.title.value()).toBe('state-value');
		} finally {
			detach();
		}
	}
);

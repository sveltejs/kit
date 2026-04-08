import { assert, expect, test, describe } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { mockRemote } from '@sveltejs/kit/test';
import { echo, set_count } from '../src/routes/remote/query-command.remote.js';
import { set_message } from '../src/routes/remote/form/[test_name]/form.remote.ts';
import FormFixture from './FormFixture.svelte';

describe('mockRemote end-to-end', () => {
	test('mock query resolves with registered data', async () => {
		mockRemote(echo).returns('mocked value');

		const result = echo('any arg');
		const value = await result;

		assert.equal(value, 'mocked value');
	});

	test('mock query exposes reactive interface', async () => {
		mockRemote(echo).returns('reactive test');

		const result = echo('arg');

		assert.equal(result.loading, true);
		assert.equal(result.ready, false);
		assert.equal(result.current, undefined);

		await result;

		assert.equal(result.loading, false);
		assert.equal(result.ready, true);
		assert.equal(result.current, 'reactive test');
	});

	test('mock query surfaces errors', async () => {
		mockRemote(echo).throws(404, { message: 'Not found' });

		const result = echo('arg');

		try {
			await result;
			assert.fail('should have thrown');
		} catch {
			assert.equal(result.error?.status, 404);
			assert.equal(result.loading, false);
		}
	});

	test('mock command resolves with registered data', async () => {
		mockRemote(set_count).returns(20);

		const result = await set_count({ c: 10 });

		assert.equal(result, 20);
	});

	test('mock form result is accessible after mockRemote', () => {
		assert.equal(set_message.result, undefined);

		mockRemote(set_message).returns('submitted successfully');
		assert.equal(set_message.result, 'submitted successfully');
	});

	test('mock form fields expose values set via withFieldValues', () => {
		mockRemote(set_message).withFieldValues({
			test_name: 'my-test',
			message: 'hello'
		});

		assert.equal(set_message.fields.test_name.value(), 'my-test');
		assert.equal(set_message.fields.message.value(), 'hello');
	});

	test('mock form fields expose issues set via withFieldIssues', () => {
		mockRemote(set_message).withFieldIssues({
			message: [{ message: 'message is invalid' }]
		});

		assert.equal(set_message.fields.message.issues()?.[0].message, 'message is invalid');
		assert.equal(set_message.fields.test_name.issues(), undefined);
	});

	test('mock form supports chaining result, values, and issues', () => {
		mockRemote(set_message)
			.returns('success')
			.withFieldValues({ message: 'hello' })
			.withFieldIssues({ test_name: [{ message: 'Required' }] });

		assert.equal(set_message.result, 'success');
		assert.equal(set_message.fields.message.value(), 'hello');
		assert.equal(set_message.fields.test_name.issues()?.[0].message, 'Required');
	});

	test('mock form fields generate input props via .as()', () => {
		mockRemote(set_message).withFieldValues({ message: 'hello' });

		const props = set_message.fields.message.as('text');
		assert.equal(props.name, 'message');
		assert.equal(props.value, 'hello');
	});
});

describe('form component rendering', () => {
	test('renders input with mocked field value', async () => {
		mockRemote(set_message).withFieldValues({ message: 'hello world' });

		await render(FormFixture);

		await expect.element(page.getByRole('textbox')).toHaveValue('hello world');
	});

	test('renders validation errors from mocked issues', async () => {
		mockRemote(set_message).withFieldIssues({
			message: [{ message: 'message is invalid' }]
		});

		await render(FormFixture);

		await expect.element(page.getByText('message is invalid')).toBeVisible();
	});

	test('renders result after mocked submission', async () => {
		mockRemote(set_message).returns('form submitted');

		await render(FormFixture);

		await expect.element(page.getByText('form submitted')).toBeVisible();
	});
});

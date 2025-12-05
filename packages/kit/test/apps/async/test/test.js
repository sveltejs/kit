import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe('remote functions', () => {
	test('query returns correct data', async ({ page, javaScriptEnabled }) => {
		await page.goto('/remote');
		await expect(page.locator('#echo-result')).toHaveText('Hello world');
		if (javaScriptEnabled) {
			await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
		}
	});

	test('query redirects on page load (query in common layout)', async ({ page }) => {
		await page.goto('/remote/query-redirect');
		await page.click('a[href="/remote/query-redirect/from-common-layout"]');
		await expect(page.locator('#redirected')).toHaveText('redirected');
		await expect(page.locator('#layout-query')).toHaveText(
			'on page /remote/query-redirect/from-common-layout/redirected (== /remote/query-redirect/from-common-layout/redirected)'
		);
	});

	test('query redirects on page load (query on page)', async ({ page }) => {
		await page.goto('/remote/query-redirect');
		await page.click('a[href="/remote/query-redirect/from-page"]');
		await expect(page.locator('#redirected')).toHaveText('redirected');
	});

	test('non-exported queries do not clobber each other', async ({ page }) => {
		await page.goto('/remote/query-non-exported');

		await expect(page.locator('h1')).toHaveText('3');
	});

	test('queries can access the route/url of the page they were called from', async ({
		page,
		clicknav
	}) => {
		await page.goto('/remote');

		await clicknav('[href="/remote/event"]');

		await expect(page.locator('[data-id="route"]')).toHaveText('route: /remote/event');
		await expect(page.locator('[data-id="pathname"]')).toHaveText('pathname: /remote/event');
	});

	test('form works', async ({ page, javaScriptEnabled }) => {
		await page.goto(`/remote/form/basic-${javaScriptEnabled}`);

		if (javaScriptEnabled) {
			await expect(page.getByText('message.current:')).toHaveText('message.current: initial');
		}
		await expect(page.getByText('await get_message():')).toHaveText('await get_message(): initial');

		await page.fill('[data-unscoped] input', 'hello');
		await page.getByText('set message').click();

		if (javaScriptEnabled) {
			await expect(page.getByText('set_message.pending:')).toHaveText('set_message.pending: 1');
			await page.getByText('resolve deferreds').click();
			await expect(page.getByText('set_message.pending:')).toHaveText('set_message.pending: 0');
			await expect(page.getByText('message.current:')).toHaveText('message.current: hello');
		}

		await expect(page.getByText('await get_message():')).toHaveText('await get_message(): hello');

		await expect(page.getByText('set_message.result')).toHaveText('set_message.result: hello');
		await expect(page.locator('[data-unscoped] input[name="message"]')).toHaveValue('');
	});

	test('form submitters work', async ({ page }) => {
		await page.goto('/remote/form/submitter');

		await page.locator('button').click();

		await expect(page.locator('#result')).toHaveText('hello');
	});

	test('form updates inputs live', async ({ page, javaScriptEnabled }) => {
		await page.goto('/remote/form/live-update');

		await page.fill('input', 'hello');

		if (javaScriptEnabled) {
			await expect(page.getByText('set_message.input.message:')).toHaveText(
				'set_message.input.message: hello'
			);
		}

		await page.getByText('set message').click();

		if (javaScriptEnabled) {
			await page.getByText('resolve deferreds').click();
		}

		await expect(page.getByText('set_message.input.message:')).toHaveText(
			'set_message.input.message:'
		);
	});

	test('form reports validation issues', async ({ page }) => {
		await page.goto('/remote/form/validation-issues');

		await page.fill('input', 'invalid');
		await page.getByText('set message').click();

		await page.getByText('message is invalid').waitFor();
	});

	test('form handles unexpected error', async ({ page }) => {
		await page.goto('/remote/form/unexpected-error');

		await page.fill('input', 'unexpected error');
		await page.getByText('set message').click();

		await page
			.getByText('This is your custom error page saying: "oops (500 Internal Error)"')
			.waitFor();
	});

	test('form handles expected error', async ({ page }) => {
		await page.goto('/remote/form/expected-error');

		await page.fill('input', 'expected error');
		await page.getByText('set message').click();

		await page.getByText('This is your custom error page saying: "oops"').waitFor();
	});

	test('form redirects', async ({ page }) => {
		await page.goto('/remote/form/redirect');

		await page.fill('input', 'redirect');
		await page.getByText('set message').click();

		await page.waitForURL('/remote');
	});

	test('form.buttonProps works', async ({ page, javaScriptEnabled }) => {
		await page.goto('/remote/form/button-props');

		await page.fill('[data-unscoped] input', 'backwards');
		await page.getByText('set reverse message').click();

		if (javaScriptEnabled) {
			await page.getByText('message.current: sdrawkcab').waitFor();
			await expect(page.getByText('await get_message():')).toHaveText(
				'await get_message(): sdrawkcab'
			);
		}

		await expect(page.getByText('set_reverse_message.result')).toHaveText(
			'set_reverse_message.result: sdrawkcab'
		);
	});

	test('form scoping with for(...) works', async ({ page, javaScriptEnabled }) => {
		await page.goto('/remote/form/form-scoped');

		await page.fill('[data-scoped] input', 'hello');
		await page.getByText('set scoped message').click();

		if (javaScriptEnabled) {
			await expect(page.getByText('scoped.pending:')).toHaveText('scoped.pending: 1');
			await page.getByText('resolve deferreds').click();
			await expect(page.getByText('scoped.pending:')).toHaveText('scoped.pending: 0');

			await page.getByText('message.current: hello').waitFor();
			await expect(page.getByText('await get_message():')).toHaveText('await get_message(): hello');
		}

		await expect(page.getByText('scoped.result')).toHaveText(
			'scoped.result: hello (from: scoped:form-scoped)'
		);
		await expect(page.locator('[data-scoped] input[name="message"]')).toHaveValue('');
	});

	test('form enhance(...) works', async ({ page, javaScriptEnabled }) => {
		await page.goto('/remote/form/enhanced');

		await page.fill('[data-enhanced] input', 'hello');

		// Click on the span inside the button to test the event.target vs event.currentTarget issue (#14159)
		await page.locator('[data-enhanced] span').click();

		if (javaScriptEnabled) {
			await expect(page.getByText('enhanced.pending:')).toHaveText('enhanced.pending: 1');

			await page.getByText('message.current: hello (override)').waitFor();

			await page.getByText('resolve deferreds').click();
			await expect(page.getByText('enhanced.pending:')).toHaveText('enhanced.pending: 0');
			await expect(page.getByText('await get_message():')).toHaveText('await get_message(): hello');

			// enhanced submission should not clear the input; the developer must do that at the appropriate time
			await expect(page.locator('[data-enhanced] input[name="message"]')).toHaveValue('hello');
		} else {
			await expect(page.locator('[data-enhanced] input[name="message"]')).toHaveValue('');
		}

		await expect(page.getByText('enhanced.result')).toHaveText(
			'enhanced.result: hello (from: enhanced:enhanced)'
		);
	});

	test('form preflight works', async ({ page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) return;

		await page.goto('/remote/form/preflight');

		for (const enhanced of [true, false]) {
			const input = page.locator(enhanced ? '[data-enhanced] input' : '[data-default] input');
			const button = page.getByText(enhanced ? 'set enhanced number' : 'set number');

			await input.fill('21');
			await button.click();
			await page.getByText('too big').waitFor();

			await input.fill('9');
			await button.click();
			await page.getByText('too small').waitFor();

			await input.fill('15');
			await button.click();
			await expect(page.getByText('number.current')).toHaveText('number.current: 15');
		}
	});

	test('form preflight-only validation works', async ({ page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) return;

		await page.goto('/remote/form/preflight-only');

		const a = page.locator('[name="a"]');
		const button = page.locator('button');
		const issues = page.locator('.issues');

		await button.click();
		await expect(issues).toContainText('a is too short');
		await expect(issues).toContainText('b is too short');
		await expect(issues).toContainText('c is too short');

		await a.fill('aaaaaaaa');
		await expect(issues).toContainText('a is too long');

		// server issues should be preserved...
		await expect(issues).toContainText('b is too short');
		await expect(issues).toContainText('c is too short');

		// ...unless overridden by client issues
		await expect(issues).not.toContainText('a is too short');
	});

	test('form validate works', async ({ page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) return;

		await page.goto('/remote/form/validate');

		const myForm = page.locator('form#my-form');
		const foo = page.locator('input[name="foo"]');
		const bar = page.locator('input[name="bar"]');
		const submit = page.locator('button:has-text("imperative validation")');

		await foo.fill('a');
		await expect(myForm).not.toContainText('Invalid type: Expected');

		await bar.fill('g');
		await expect(myForm).toContainText('Invalid type: Expected ("d" | "e") but received "g"');

		await bar.fill('d');
		await expect(myForm).not.toContainText('Invalid type: Expected');

		await page.locator('#trigger-validate').click();
		await expect(myForm).toContainText(
			'Invalid type: Expected "submitter" but received "incorrect_value"'
		);

		// Test imperative validation
		await foo.fill('c');
		await bar.fill('d');
		await submit.click();
		await expect(myForm).toContainText('Imperative: foo cannot be c');

		const nestedValue = page.locator('input[name="nested.value"]');
		const validate = page.locator('button#validate');
		const allIssues = page.locator('#allIssues');

		await nestedValue.fill('in');
		await validate.click();
		await expect(allIssues).toContainText('"path":["nested","value"]');
	});

	test('form validation issues cleared', async ({ page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) return;

		await page.goto('/remote/form/validate');

		const baz = page.locator('input[name="baz"]');
		const submit = page.locator('#my-form-2 button');

		await baz.fill('c');
		await submit.click();
		await expect(page.locator('#my-form-2')).toContainText('Invalid type: Expected');

		await baz.fill('a');
		await submit.click();
		await expect(page.locator('#my-form-2')).not.toContainText('Invalid type: Expected');
		await expect(page.locator('[data-error]')).toHaveText('An error occurred');

		await baz.fill('c');
		await submit.click();
		await expect(page.locator('#my-form-2')).toContainText('Invalid type: Expected');

		await baz.fill('b');
		await submit.click();
		await expect(page.locator('#my-form-2')).not.toContainText('Invalid type: Expected');
		await expect(page.locator('[data-error]')).toHaveText('No error');
	});

	test('form inputs excludes underscore-prefixed fields', async ({ page, javaScriptEnabled }) => {
		if (javaScriptEnabled) return;

		await page.goto('/remote/form/underscore');

		await page.fill('input[name="username"]', 'abcdefg');
		await page.fill('input[name="_password"]', 'pqrstuv');
		await page.locator('button').click();

		await expect(page.locator('input[name="username"]')).toHaveValue('abcdefg');
		await expect(page.locator('input[name="_password"]')).toHaveValue('');
	});

	test('prerendered entries not called in prod', async ({ page, clicknav }) => {
		await page.goto('/remote/prerender');
		await clicknav('[href="/remote/prerender/whole-page"]');
		await expect(page.locator('#prerendered-data')).toHaveText('a c 中文 yes');

		await page.goto('/remote/prerender');
		await clicknav('[href="/remote/prerender/functions-only"]');
		await expect(page.locator('#prerendered-data')).toHaveText('a c 中文 yes');
	});

	test('form.fields.value() returns correct nested object structure', async ({
		page,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) return;

		await page.goto('/remote/form/value');

		// Initially should be empty object or undefined values
		const initialValue = await page.locator('#full-value').textContent();
		expect(JSON.parse(initialValue)).toEqual({});

		// Fill leaf field
		await page.fill('input[name="leaf"]', 'leaf-value');
		const afterLeaf = await page.locator('#full-value').textContent();
		expect(JSON.parse(afterLeaf)).toEqual({
			leaf: 'leaf-value'
		});

		// Fill object.leaf field
		await page.fill('input[name="object.leaf"]', 'object-leaf-value');
		const afterObjectLeaf = await page.locator('#full-value').textContent();
		expect(JSON.parse(afterObjectLeaf)).toEqual({
			leaf: 'leaf-value',
			object: {
				leaf: 'object-leaf-value'
			}
		});

		// Fill object.array fields
		await page.fill('input[name="object.array[0]"]', 'array-item-1');
		const afterArrayItem1 = await page.locator('#full-value').textContent();
		expect(JSON.parse(afterArrayItem1)).toEqual({
			leaf: 'leaf-value',
			object: {
				leaf: 'object-leaf-value',
				array: ['array-item-1']
			}
		});

		await page.fill('input[name="object.array[1]"]', 'array-item-2');
		const afterArrayItem2 = await page.locator('#full-value').textContent();
		expect(JSON.parse(afterArrayItem2)).toEqual({
			leaf: 'leaf-value',
			object: {
				leaf: 'object-leaf-value',
				array: ['array-item-1', 'array-item-2']
			}
		});

		// Fill array[0].leaf field
		await page.fill('input[name="array[0].leaf"]', 'array-0-leaf');
		const afterArray0 = await page.locator('#full-value').textContent();
		expect(JSON.parse(afterArray0)).toEqual({
			leaf: 'leaf-value',
			object: {
				leaf: 'object-leaf-value',
				array: ['array-item-1', 'array-item-2']
			},
			array: [{ leaf: 'array-0-leaf' }]
		});

		// Fill array[1].leaf field
		await page.fill('input[name="array[1].leaf"]', 'array-1-leaf');
		const afterArray1 = await page.locator('#full-value').textContent();
		expect(JSON.parse(afterArray1)).toEqual({
			leaf: 'leaf-value',
			object: {
				leaf: 'object-leaf-value',
				array: ['array-item-1', 'array-item-2']
			},
			array: [{ leaf: 'array-0-leaf' }, { leaf: 'array-1-leaf' }]
		});

		// Test nested object value access
		const objectValue = await page.locator('#object-value').textContent();
		expect(JSON.parse(objectValue)).toEqual({
			leaf: 'object-leaf-value',
			array: ['array-item-1', 'array-item-2']
		});

		// Test array value access
		const arrayValue = await page.locator('#array-value').textContent();
		expect(JSON.parse(arrayValue)).toEqual([{ leaf: 'array-0-leaf' }, { leaf: 'array-1-leaf' }]);
	});

	test('selects are not nuked when unrelated controls change', async ({
		page,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) return;

		await page.goto('/remote/form/select-untouched');

		await page.fill('input', 'hello');
		await expect(page.locator('select')).toHaveValue('one');
	});
	test('file uploads work', async ({ page }) => {
		await page.goto('/remote/form/file-upload');

		await page.locator('input[name="file1"]').setInputFiles({
			name: 'a.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('a')
		});
		await page.locator('input[name="file2"]').setInputFiles({
			name: 'b.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('b')
		});
		await page.locator('input[type="checkbox"]').check();
		await page.locator('button').click();

		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({
				text: 'Hello world',
				file1: 'a',
				file2: 'b'
			})
		);
	});
	test('large file uploads work', async ({ page }) => {
		await page.goto('/remote/form/file-upload');

		await page.locator('input[name="file1"]').setInputFiles({
			name: 'a.txt',
			mimeType: 'text/plain',
			buffer: Buffer.alloc(1024 * 1024 * 10)
		});
		await page.locator('input[name="file2"]').setInputFiles({
			name: 'b.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('b')
		});
		await page.locator('button').click();

		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({
				text: 'Hello world',
				file1: 1024 * 1024 * 10,
				file2: 1
			})
		);
	});
});

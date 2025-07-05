import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

describe("Hono handler's tests", () => {
	const app = new Hono();

	app.use();

	test('handler check', () => {
		expect(true).toBe(true);
	});
});

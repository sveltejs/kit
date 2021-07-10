import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('visits a route with non-ASCII character', '/encoded', async ({ page, clicknav }) => {
		await clicknav('[href="/encoded/苗条"]');
		assert.equal(await page.innerHTML('h1'), 'static');
		assert.equal(await page.innerHTML('h2'), '/encoded/苗条');
		assert.equal(await page.innerHTML('h3'), '/encoded/苗条');
	});

	test(
		'visits a dynamic route with non-ASCII character',
		'/encoded',
		async ({ page, clicknav }) => {
			await clicknav('[href="/encoded/土豆"]');
			assert.equal(await page.innerHTML('h1'), 'dynamic');
			assert.equal(await page.innerHTML('h2'), '/encoded/土豆: 土豆');
			assert.equal(await page.innerHTML('h3'), '/encoded/土豆: 土豆');
		}
	);

	test('redirects correctly with non-ASCII location', '/encoded', async ({ page, clicknav }) => {
		await clicknav('[href="/encoded/反应"]');

		assert.equal(await page.innerHTML('h1'), 'static');
		assert.equal(await page.innerHTML('h2'), '/encoded/苗条');
		assert.equal(await page.innerHTML('h3'), '/encoded/苗条');
	});

	test('sets charset on JSON Content-Type', null, async ({ fetch }) => {
		const response = await fetch('/encoded/endpoint');
		assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
	});
}

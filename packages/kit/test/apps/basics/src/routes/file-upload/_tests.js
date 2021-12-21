import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
    test('handle file upload', null, async ({ page }) => {
        await page.click('#submit');
        await page.waitForSelector('#result');
        assert.equal(await page.textContent('#result'), '{"filename":"favicon.png"}');
    });
}


import { test } from '../../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !!javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });
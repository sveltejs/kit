import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { resolve } from './resolve.js';

test('resolves a root-relative path', () => {
	assert.equal(resolve('/a/b/c', '/x/y/z'), '/x/y/z');
});

test('resolves a relative path without a leading .', () => {
	assert.equal(resolve('/a/b/c', 'd'), '/a/b/d');
});

test('resolves a relative path with leading .', () => {
	assert.equal(resolve('/a/b/c', './d'), '/a/b/d');
});

test('resolves a relative path with leading ..', () => {
	assert.equal(resolve('/a/b/c', '../d'), '/a/d');
});

test('resolves a relative path with extraneous leading ..', () => {
	assert.equal(resolve('/a/b/c', '../../../../../d'), '/d');
});

test.run();

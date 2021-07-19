import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { resolve } from './resolve.js';

test('resolves a root-relative path', () => {
	assert.equal(resolve('/a/b/c', '/x/y/z'), '/x/y/z');
});

test('resolves a relative path without a leading .', () => {
	assert.equal(resolve('/a/b/c', 'd'), '/a/b/d');
});

test('resolves a relative path with trailing /', () => {
	assert.equal(resolve('/a/b/c', 'd/'), '/a/b/d/');
});

test('resolves a relative path with leading .', () => {
	assert.equal(resolve('/a/b/c', './d'), '/a/b/d');
});

test('resolves a relative path with . in the middle', () => {
	assert.equal(resolve('/a/b/c', 'd/./e/./f'), '/a/b/d/e/f');
});

test('resolves a relative path with leading ..', () => {
	assert.equal(resolve('/a/b/c', '../d'), '/a/d');
});

test('resolves a relative path with .. in the middle', () => {
	assert.equal(resolve('/a/b/c', 'd/./e/../f'), '/a/b/d/f');
});

test('resolves a relative path with extraneous leading ..', () => {
	assert.equal(resolve('/a/b/c', '../../../../../d'), '/d');
});

test('resolves a root-relative path with .', () => {
	assert.equal(resolve('/a/b/c', '/x/./y/../z'), '/x/z');
});

test('resolves a protocol-relative path', () => {
	assert.equal(resolve('/a/b/c', '//example.com/foo'), '//example.com/foo');
});

test('resolves an absolute path', () => {
	assert.equal(resolve('/a/b/c', 'https://example.com/foo'), 'https://example.com/foo');
});

test.run();

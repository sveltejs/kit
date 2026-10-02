import { assert, describe } from 'vitest';
import { relative } from './path.js';

describe('relative', (test) => {
	test('same path returns .', () => {
		assert.equal(relative('/a/b/c', '/a/b/c'), '.');
	});

	test('sibling path', () => {
		assert.equal(relative('/a/b', '/a/c'), '../c');
	});

	test('child path', () => {
		assert.equal(relative('/a', '/a/b/c'), 'b/c');
	});

	test('parent path', () => {
		assert.equal(relative('/a/b/c', '/a'), '../..');
	});

	test('unrelated paths', () => {
		assert.equal(relative('/a/b', '/c/d'), '../../c/d');
	});

	test('root to child', () => {
		assert.equal(relative('/', '/a/b'), 'a/b');
	});

	test('child to root', () => {
		assert.equal(relative('/a/b', '/'), '../..');
	});
});

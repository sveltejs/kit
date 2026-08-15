import { describe, it, expect } from 'vitest';
import { create_replacer } from './utils.js';

describe('create_replacer', () => {
	it('serialises a Uint8Array to new Uint8Array([...]) via default devalue handling', () => {
		const replacer = create_replacer({});
		// Uint8Array has no special case in create_replacer — devalue handles it natively.
		// Ensure the replacer does not interfere with the default path.
		const result = replacer(new Uint8Array([1, 2, 3]));
		// replacer returns undefined for unknown types it doesn't handle, so devalue
		// falls through to its built-in TypedArray serialiser.
		expect(result).toBeUndefined();
	});

	it('serialises a Node.js Buffer to new Uint8Array([...]) without embedding the pool', () => {
		// Buffer.allocUnsafe uses a shared pool — the backing ArrayBuffer is much
		// larger than the Buffer's length. Without the fix, devalue.uneval would embed
		// the entire pool and use .subarray() to address the slice, which can include
		// arbitrary bytes that produce U+FFFD in the HTML.
		const replacer = create_replacer({});
		const buf = Buffer.from([1, 200, 0, 255]);
		const result = replacer(buf);

		expect(result).toBe('new Uint8Array([1,200,0,255])');
	});

	it('serialises an empty Buffer to new Uint8Array([])', () => {
		const replacer = create_replacer({});
		const result = replacer(Buffer.alloc(0));
		expect(result).toBe('new Uint8Array([])');
	});

	it('handles a Buffer allocated from the pool (allocUnsafe) without leaking pool bytes', () => {
		// Buffer.allocUnsafe allocates from the 8 KiB pool, so buf.buffer.byteLength
		// will be much larger than buf.byteLength. The replacer must only emit the
		// buf.byteLength bytes, not the full pool.
		const replacer = create_replacer({});
		const buf = Buffer.allocUnsafe(4);
		buf.writeUInt8(42, 0);
		buf.writeUInt8(43, 1);
		buf.writeUInt8(44, 2);
		buf.writeUInt8(45, 3);

		const result = replacer(buf);

		// The result must contain exactly 4 values, not thousands from the pool.
		expect(result).toBe(`new Uint8Array([${buf[0]},${buf[1]},${buf[2]},${buf[3]}])`);
	});

	it('does not interfere with transport-encoded values', () => {
		// If a custom transport encoder matches the value, that path must still work.
		const customThing = { __custom: true };
		const transport = {
			custom: {
				encode: (/** @type {unknown} */ v) => (v === customThing ? [1, 2, 3] : null),
				decode: (/** @type {unknown} */ v) => v
			}
		};
		const replacer = create_replacer(transport);
		const result = replacer(customThing);

		expect(result).toMatch(/app\.decode\('custom'/);
	});
});

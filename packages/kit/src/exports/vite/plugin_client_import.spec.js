// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create_client_import_plugin } from './plugin_client_import.js';

describe('create_client_import_plugin', () => {
	/** @type {import('types').ManifestData} */
	let manifest_data;

	/** @type {import('types').ValidatedKitConfig} */
	let kit;

	let out;
	let cwd;

	beforeEach(() => {
		manifest_data = {
			nodes: [],
			routes: [],
			matchers: {},
			hooks: {}
		};

		kit = {
			appDir: '_app',
			paths: {
				base: '',
				assets: '',
				relative: false
			},
			outDir: '.svelte-kit'
		};

		out = '/test/output';
		cwd = '/test/project';
	});

	describe('plugin creation', () => {
		it('creates plugin with correct name', () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });
			expect(plugin.name).toBe('vite-plugin-sveltekit-client-import');
		});

		it('returns get_client_imports function', () => {
			const { get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});
			expect(typeof get_client_imports).toBe('function');
		});

		it('returns write_client_import_manifest function', () => {
			const { write_client_import_manifest } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});
			expect(typeof write_client_import_manifest).toBe('function');
		});
	});

	describe('resolveId hook', () => {
		it('resolves virtual client-import modules', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });
			const id = '\0sveltekit-client-import:abc123';
			const result = await plugin.resolveId(id);
			expect(result).toBe(id);
		});

		it('handles client-import query parameter', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			// Mock the resolve function
			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			const result = await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			expect(mockContext.resolve).toHaveBeenCalledWith(
				'./Component.svelte',
				'/test/project/src/routes/+page.server.js',
				expect.objectContaining({ skipSelf: true })
			);

			// In SSR context, returns virtual stub module
			expect(result).toContain('\0sveltekit-client-import:stub:');
		});

		it('handles client-import with multiple query parameters', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			// Mock the resolve function
			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			const result = await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?client-import&other=param',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			expect(mockContext.resolve).toHaveBeenCalledWith(
				'./Component.svelte?other=param',
				'/test/project/src/routes/+page.server.js',
				expect.objectContaining({ skipSelf: true })
			);

			// In SSR context, returns virtual stub module
			expect(result).toContain('\0sveltekit-client-import:stub:');
		});

		it('handles client-import as second query parameter', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			// Mock the resolve function
			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			const result = await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?other=param&client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			expect(mockContext.resolve).toHaveBeenCalledWith(
				'./Component.svelte?other=param',
				'/test/project/src/routes/+page.server.js',
				expect.objectContaining({ skipSelf: true })
			);

			// In SSR context, returns virtual stub module
			expect(result).toContain('\0sveltekit-client-import:stub:');
		});

		it('handles client-import in the middle of multiple parameters', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			// Mock the resolve function
			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			const result = await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?param&client-import&other=param',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			expect(mockContext.resolve).toHaveBeenCalledWith(
				'./Component.svelte?param&other=param',
				'/test/project/src/routes/+page.server.js',
				expect.objectContaining({ skipSelf: true })
			);

			// In SSR context, returns virtual stub module
			expect(result).toContain('\0sveltekit-client-import:stub:');
		});

		it('handles client-import query in client context (should not normally occur)', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			// Mock the resolve function
			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			const result = await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?client-import',
				'/test/project/src/routes/+page.svelte',
				{ ssr: false }
			);

			// In non-SSR context, returns the resolved module (strips the query parameter)
			expect(result).toEqual({
				id: '/test/project/src/lib/Component.svelte',
				external: false
			});
		});

		it('returns null for unrelated imports', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });
			const result = await plugin.resolveId('/test/normal-import.js');
			expect(result).toBeUndefined();
		});
	});

	describe('load hook', () => {
		it('loads virtual stub modules', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			// Manually add a client import
			get_client_imports().set('abc123', {
				file: '/test/project/src/lib/Component.svelte',
				hash: 'abc123',
				id: 'src/lib/Component.svelte'
			});

			const result = await plugin.load('\0sveltekit-client-import:abc123');
			expect(result).toContain('__CLIENT_IMPORT_PLACEHOLDER_abc123__');
			expect(result).toContain('export default');
		});

		it('handles client-import query in SSR context', async () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			// client-import queries in SSR context are handled by resolveId, not load
			// load should return null for these
			const result = await plugin.load('/test/project/src/lib/Component.svelte?client-import', {
				ssr: true
			});

			expect(result).toBeNull();
		});

		it('returns null for client-import query in client context', () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			const result = plugin.load('/test/project/src/lib/Component.svelte?client-import', {
				ssr: false
			});

			expect(result).toBeNull();
		});

		it('throws error for unknown virtual module', () => {
			const { plugin } = create_client_import_plugin({ manifest_data, kit, out, cwd });

			expect(() => {
				plugin.load('\0sveltekit-client-import:unknown-hash');
			}).toThrow('Expected to find metadata for client import');
		});
	});

	describe('get_client_build_inputs', () => {
		it('returns client imports as build inputs', () => {
			const { get_client_imports, get_client_build_inputs } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			// Add some client imports
			get_client_imports().set('abc123', {
				file: '/test/project/src/lib/ComponentA.svelte',
				hash: 'abc123',
				id: 'src/lib/ComponentA.svelte',
				original_specifier: '$lib/ComponentA.svelte'
			});

			get_client_imports().set('def456', {
				file: '/test/project/src/lib/ComponentB.svelte',
				hash: 'def456',
				id: 'src/lib/ComponentB.svelte',
				original_specifier: '$lib/ComponentB.svelte'
			});

			const inputs = get_client_build_inputs();

			expect(inputs).toHaveProperty('client-imports/abc123');
			expect(inputs).toHaveProperty('client-imports/def456');
			expect(inputs['client-imports/abc123']).toBe('/test/project/src/lib/ComponentA.svelte');
		});

		it('returns empty object when no client imports tracked', () => {
			const { get_client_build_inputs } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const inputs = get_client_build_inputs();
			expect(Object.keys(inputs).length).toBe(0);
		});
	});

	describe('get_client_imports', () => {
		it('returns empty map initially', () => {
			const { get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const imports = get_client_imports();
			expect(imports.size).toBe(0);
		});

		it('tracks imports after resolveId', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			const imports = get_client_imports();
			expect(imports.size).toBeGreaterThan(0);

			const firstImport = Array.from(imports.values())[0];
			expect(firstImport.file).toBe('/test/project/src/lib/Component.svelte');
		});
	});

	describe('hash generation', () => {
		it('generates consistent hashes for same file', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component.svelte',
					external: false
				})
			};

			// Resolve same file twice
			await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			await plugin.resolveId.call(
				mockContext,
				'./Component.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			// Should only have one entry (same hash)
			const imports = get_client_imports();
			expect(imports.size).toBe(1);
		});

		it('generates different hashes for different files', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const mockContext = {
				resolve: vi
					.fn()
					.mockResolvedValueOnce({
						id: '/test/project/src/lib/ComponentA.svelte',
						external: false
					})
					.mockResolvedValueOnce({
						id: '/test/project/src/lib/ComponentB.svelte',
						external: false
					})
			};

			await plugin.resolveId.call(
				mockContext,
				'./ComponentA.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			await plugin.resolveId.call(
				mockContext,
				'./ComponentB.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			const imports = get_client_imports();
			expect(imports.size).toBe(2);

			const hashes = Array.from(imports.keys());
			expect(hashes[0]).not.toBe(hashes[1]);
		});
	});

	describe('placeholder generation', () => {
		it('generates unique placeholders for different hashes', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			// Manually add client imports to the same plugin instance
			get_client_imports().set('abc123', {
				file: '/test/ComponentA.svelte',
				hash: 'abc123',
				id: 'ComponentA.svelte',
				original_specifier: './ComponentA.svelte'
			});
			get_client_imports().set('def456', {
				file: '/test/ComponentB.svelte',
				hash: 'def456',
				id: 'ComponentB.svelte',
				original_specifier: './ComponentB.svelte'
			});

			// Load the virtual modules
			const result1 = await plugin.load('\0sveltekit-client-import:abc123');
			const result2 = await plugin.load('\0sveltekit-client-import:def456');

			expect(result1).toContain('__CLIENT_IMPORT_PLACEHOLDER_abc123__');
			expect(result2).toContain('__CLIENT_IMPORT_PLACEHOLDER_def456__');
			expect(result1).not.toContain('__CLIENT_IMPORT_PLACEHOLDER_def456__');
			expect(result1).toContain('export default');
			expect(result2).toContain('export default');
		});
	});

	describe('edge cases', () => {
		it('handles absolute paths', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/absolute/path/to/Component.svelte',
					external: false
				})
			};

			await plugin.resolveId.call(
				mockContext,
				'/absolute/path/to/Component.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			const imports = get_client_imports();
			expect(imports.size).toBe(1);
		});

		it('handles relative paths with ../', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/lib/Component.svelte',
					external: false
				})
			};

			await plugin.resolveId.call(
				mockContext,
				'../lib/Component.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			const imports = get_client_imports();
			expect(imports.size).toBe(1);
		});

		it('handles files with special characters', async () => {
			const { plugin, get_client_imports } = create_client_import_plugin({
				manifest_data,
				kit,
				out,
				cwd
			});

			const mockContext = {
				resolve: vi.fn().mockResolvedValue({
					id: '/test/project/src/lib/Component-v2.0.svelte',
					external: false
				})
			};

			await plugin.resolveId.call(
				mockContext,
				'./Component-v2.0.svelte?client-import',
				'/test/project/src/routes/+page.server.js',
				{ ssr: true }
			);

			const imports = get_client_imports();
			expect(imports.size).toBe(1);

			const firstImport = Array.from(imports.values())[0];
			expect(firstImport.file).toBe('/test/project/src/lib/Component-v2.0.svelte');
		});
	});
});

import { getCompileData, CompileData, compileSvelte } from './utils/compile';
import { ModuleNode, HmrContext } from 'vite';
import { log } from './utils/log';
import { SvelteRequest } from './utils/id';

/**
 * Vite-specific HMR handling
 */
export async function handleHotUpdate(
	ctx: HmrContext,
	svelteRequest: SvelteRequest
): Promise<ModuleNode[] | void> {
	const { read, server } = ctx;
	const cachedCompileData = getCompileData(svelteRequest, false);
	if (!cachedCompileData) {
		// file hasn't been requested yet (e.g. async component)
		log.debug(`handleHotUpdate first call ${svelteRequest.id}`);
		return;
	}

	const content = await read();
	const compileData: CompileData = await compileSvelte(
		svelteRequest,
		content,
		cachedCompileData.options
	);
	const affectedModules = new Set<ModuleNode | undefined>();

	const cssModule = server.moduleGraph.getModuleById(svelteRequest.cssId);
	const mainModule = server.moduleGraph.getModuleById(svelteRequest.id);
	if (cssModule && cssChanged(cachedCompileData, compileData)) {
		log.debug('handleHotUpdate css changed');
		affectedModules.add(cssModule);
	}

	if (mainModule && jsChanged(cachedCompileData, compileData)) {
		log.debug('handleHotUpdate js changed');
		affectedModules.add(mainModule);
	}

	const result = [...affectedModules].filter(Boolean) as ModuleNode[];
	log.debug(`handleHotUpdate result for ${svelteRequest.id}`, result);

	// TODO is this enough? see also: https://github.com/vitejs/vite/issues/2274
	const ssrModulesToInvalidate = result.filter((m) => !!m.ssrTransformResult);
	if (ssrModulesToInvalidate.length > 0) {
		log.debug(`invalidating modules ${ssrModulesToInvalidate.map((m) => m.id).join(', ')}`);
		ssrModulesToInvalidate.forEach((moduleNode) => server.moduleGraph.invalidateModule(moduleNode));
	}

	return result;
}

function cssChanged(prev: CompileData, next: CompileData) {
	return !isCodeEqual(prev.compiled.css, next.compiled.css);
}

function jsChanged(prev: CompileData, next: CompileData) {
	return !isCodeEqual(prev.compiled.js, next.compiled.js);
}

function isCodeEqual(
	a: { code: string; map?: any; dependencies?: any[] },
	b: { code: string; map?: any; dependencies?: any[] }
): boolean {
	if (a === b) {
		return true;
	}
	if (a == null && b == null) {
		return true;
	}
	if (a == null || b == null) {
		return false;
	}
	return a.code === b.code;
}

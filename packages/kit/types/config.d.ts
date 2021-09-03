import { UserConfig as ViteConfig } from 'vite';
import { Infer } from 'superstruct';
import { DeepPartial } from './helper';
import { Logger } from './internal';
import { options_type } from '../src/core/config/options';

export interface AdapterUtils {
	log: Logger;
	rimraf(dir: string): void;
	mkdirp(dir: string): void;
	copy_client_files(dest: string): void;
	copy_server_files(dest: string): void;
	copy_static_files(dest: string): void;
	copy(from: string, to: string, filter?: (basename: string) => boolean): void;
	prerender(options: { all?: boolean; dest: string; fallback?: string }): Promise<void>;
}

export interface Adapter {
	name: string;
	adapt(context: { utils: AdapterUtils; config: ValidatedConfig }): Promise<void>;
}

export interface PrerenderErrorHandler {
	(details: {
		status: number;
		path: string;
		referrer: string | null;
		referenceType: 'linked' | 'fetched';
	}): void;
}

export type PrerenderOnErrorValue = 'fail' | 'continue' | PrerenderErrorHandler;

export type ValidatedConfig = Infer<ReturnType<typeof options_type>>;

export type Config = PartialConfig<ValidatedConfig>;

type PartialConfig<T> = {
	[K in keyof T]?: K extends 'vite' ? ViteConfig | (() => ViteConfig) : DeepPartial<T[K]>;
};

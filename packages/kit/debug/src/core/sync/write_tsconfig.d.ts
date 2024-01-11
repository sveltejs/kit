/**
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {import('../../types/internal.d.ts').ValidatedKitConfig} kit
 */
export function write_tsconfig(kit: import('../../types/internal.d.ts').ValidatedKitConfig, cwd?: string): void;
/**
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {import('../../types/internal.d.ts').ValidatedKitConfig} kit
 */
export function get_tsconfig(kit: import('../../types/internal.d.ts').ValidatedKitConfig): Record<string, any> | {
    compilerOptions: {
        paths: Record<string, string[]>;
        rootDirs: string[];
        verbatimModuleSyntax: boolean;
        isolatedModules: boolean;
        lib: string[];
        moduleResolution: string;
        module: string;
        noEmit: boolean;
        target: string;
    };
    include: string[];
    exclude: string[];
};
//# sourceMappingURL=write_tsconfig.d.ts.map
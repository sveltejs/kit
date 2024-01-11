export namespace actions {
    function _default(): import("../../../../../exports/public.js").ActionFailure<{
        fail: string;
    }> | {
        success: boolean;
    };
    export { _default as default };
    export function successWithPayload(): {
        id: number;
        username: string;
        profession: string;
    };
    export function successWithoutPayload(): void;
    export function failWithPayload(): import("../../../../../exports/public.js").ActionFailure<{
        reason: {
            error: {
                code: "VALIDATION_FAILED";
            };
        };
    }>;
    export function failWithoutPayload(): import("../../../../../exports/public.js").ActionFailure<undefined>;
}
/**
 * Ordinarily this would live in a +page.svelte, but to make it easy to run the tests, we put it here.
 * The `export` is so that eslint doesn't throw a hissy fit about the unused variable
 * @type {import('./.svelte-kit/types/src/core/sync/write_types/test/actions/$types').SubmitFunction}
 */
export const submit: any;
//# sourceMappingURL=+page.server.d.ts.map
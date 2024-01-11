/**
 * Create an async iterator and a function to push values into it
 * @returns {{
 *   iterator: AsyncIterable<any>;
 *   push: (value: any) => void;
 *   done: () => void;
 * }}
 */
export function create_async_iterator(): {
    iterator: AsyncIterable<any>;
    push: (value: any) => void;
    done: () => void;
};
//# sourceMappingURL=streaming.d.ts.map
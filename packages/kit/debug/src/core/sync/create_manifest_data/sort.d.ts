/** @param {import('../../../types/internal.d.ts').RouteData[]} routes */
export function sort_routes(routes: import('../../../types/internal.d.ts').RouteData[]): import("../../../types/internal.d.ts").RouteData[];
export type Part = {
    type: 'static' | 'required' | 'optional' | 'rest';
    content: string;
    matched: boolean;
};
export type Segment = Part[];
//# sourceMappingURL=sort.d.ts.map
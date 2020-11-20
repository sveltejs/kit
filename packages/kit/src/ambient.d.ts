declare module "MANIFEST" {
  import { SvelteComponent } from "svelte";

  export type Route = {
    pattern: RegExp;
    parts: {
      params: (match: RegExpExecArray) => Record<string, string>,
      i: number
    }[];
  };  

  export const components: (() => SvelteComponent)[];
  export const routes: Route[];
  export const layout: SvelteComponent;
  export const ErrorComponent: SvelteComponent;
}

declare module "ROOT" {
  import { SvelteComponent } from "svelte";

  type Constructor<T> = {
    new (...args: any[]): T;
  }

  const root: Constructor<SvelteComponent>;
  export default root;
}

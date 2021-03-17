import { CSRComponent, Page } from '../../../types.internal';

export type NavigationTarget = {
	nodes: Array<Promise<CSRComponent>>;
	page: Page;
};

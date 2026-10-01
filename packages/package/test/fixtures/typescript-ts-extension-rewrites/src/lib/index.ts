import { helper } from '#lib/helper.ts';
import { helper2 } from './helper2.ts';

import.meta.glob('./helper*.ts');
import.meta.glob(["./helper*.ts", '!./helper2.ts'], { eager: true });
import.meta.glob(`../lib/*.ts`);
import.meta.glob('./it\'s.ts');
import.meta.glob("./escaped\u002ets");

const pattern = './helper*.ts';
import.meta.glob(pattern);
import.meta.glob(['./helper*.ts', pattern]);
import.meta.glob?.('./optional-call.ts');
import.meta?.glob('./optional-access.ts');
import.meta['glob']('./element-access.ts');

const text = "import.meta.glob('./helper*.ts')";
const glob = { glob: (_pattern: string) => text };
glob.glob('./helper*.ts');

// import.meta.glob('./helper*.ts') must remain unchanged in comments.

export { helper, helper2 };

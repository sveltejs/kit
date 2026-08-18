import { helper } from "./helper.js";
import { helper2 } from "./helper2.js";
import.meta.glob('./helper*.js');
import.meta.glob(["./helper*.js", '!./helper2.js'], { eager: true });
import.meta.glob(`../lib/*.js`);
import.meta.glob('./it\'s.js');
import.meta.glob("./escaped.js");
const pattern = "./helper*.ts";
import.meta.glob(pattern);
import.meta.glob(["./helper*.ts", pattern]);
import.meta.glob?.("./optional-call.ts");
import.meta?.glob("./optional-access.ts");
import.meta["glob"]("./element-access.ts");
const text = "import.meta.glob('./helper*.ts')";
const glob = { glob: (_pattern) => text };
glob.glob("./helper*.ts");
// import.meta.glob('./helper*.ts') must remain unchanged in comments.
export { helper, helper2 };

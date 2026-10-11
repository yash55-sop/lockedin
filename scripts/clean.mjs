import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../.next/", import.meta.url));
rmSync(output, { recursive: true, force: true });

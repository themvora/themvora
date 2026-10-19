/**
 * The `themvora` binary.
 *
 * A bootstrap and nothing else: the dispatcher lives in `run.ts` so it can be
 * driven in-process by the test suite. This file's only job is to turn the
 * returned exit code into a real process exit.
 *
 * There is deliberately no `#!` line here — `tsup.config.ts` injects the shebang
 * as a build banner, and declaring it in both places emits it twice, which is a
 * syntax error in the shipped `dist/cli.cjs`.
 *
 * @packageDocumentation
 */
import { run } from "./run.js";

run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(
      `Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  },
);

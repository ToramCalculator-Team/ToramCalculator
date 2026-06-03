import { spawnSync } from "node:child_process";

const releaseId = process.env.APP_RELEASE_ID || String(Date.now());
const generatedAt = process.env.APP_GENERATED_AT || new Date(Number(releaseId) || Date.now()).toISOString();

const env = {
	...process.env,
	APP_RELEASE_ID: releaseId,
	APP_ASSET_VERSION: process.env.APP_ASSET_VERSION || releaseId,
	APP_SW_VERSION: process.env.APP_SW_VERSION || releaseId,
	APP_GENERATED_AT: generatedAt,
};

function run(command, args, extraEnv = {}) {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		env: { ...env, ...extraEnv },
		shell: process.platform === "win32",
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

console.log(`Release ID: ${releaseId}`);
run("node", ["src/worker/sw/build.mjs"]);
run("vite", ["build"], { NODE_OPTIONS: "--max-old-space-size=4096" });

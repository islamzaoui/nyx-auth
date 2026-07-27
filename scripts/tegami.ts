import { tegami } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";

const paper = tegami({
	plugins: [
		github({
			repo: "islamzaoui/nyx-auth",
			versionPr: {
				base: "main",
			},
		}),
	],
	npm: {
		client: "bun",
		onBreakPeerDep: "ignore",
		trustedPublish: {
			provider: "github",
			workflow: "publish.yaml",
		},
	},
	packages: {
		"@nyx-auth/core": {},
		"@nyx-auth/drizzle-adapter": {},
	},
});

await runCli(paper);

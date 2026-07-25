import { tegami } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";

const group = "nyx-auth";

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
		trustedPublish: {
			provider: "github",
			workflow: "publish.yaml",
		},
	},
	packages: {
		"@nyx-auth/core": {
			group,
		},
		"@nyx-auth/drizzle-adapter": {
			group,
		},
	},
});

await runCli(paper);

import { defineConfig } from "bunup";

export default defineConfig({
	entry: ["src/index.ts"],
	sourceBase: "src",
	format: "esm",
	target: "browser",
	dts: true,
	exports: true,
});

import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { pinoLogger } from "hono-pino";
import { auth } from "@/middlewares/auth";
import { indexRoute } from "@/routes/index.route";
import openapiJSON from "../generated/openapi.json" with { type: "json" };

const app = new Hono()
	.use(
		pinoLogger({
			pino: { level: "debug" },
		})
	)
	.use(auth)
	.get(
		"/",
		Scalar({
			url: "/openapi.json",
			theme: "kepler",
			layout: "modern",
			defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
		})
	)
	.get("/openapi.json", async (c) => {
		return c.json(openapiJSON);
	})
	.route("/", indexRoute);

export default app;

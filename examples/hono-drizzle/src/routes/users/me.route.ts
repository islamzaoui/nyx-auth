import { userFactory } from "@/lib/factory";

export const meRoute = userFactory.createApp().get("/", async (c) => {
	return c.json({ code: "SUCCESS", user: c.var.user, session: c.var.session });
});

export type AppType = typeof meRoute;

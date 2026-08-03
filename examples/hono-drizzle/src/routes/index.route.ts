import { baseFactory } from "@/lib/factory";
import { authRoute } from "./auth.route";
import { todosRoute } from "./todos.route";
import { usersRoute } from "./users/index.route";

export const indexRoute = baseFactory.createApp().route("/auth", authRoute).route("/users", usersRoute).route("/todos", todosRoute);

export type AppType = typeof indexRoute;

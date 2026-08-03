import { baseFactory } from "@/lib/factory";
import { meRoute } from "./me.route";

export const usersRoute = baseFactory.createApp().route("/me", meRoute);

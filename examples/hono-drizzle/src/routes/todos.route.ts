import { userFactory } from "@/lib/factory";
import { validator } from "@/middlewares/validator";
import { createTodo, deleteTodo, findTodoByIdAndUserId, findTodosByUserId, updateTodo } from "@/repositories/todo";
import { CreateTodoSchema, UpdateTodoSchema } from "@/schemas/todo.schema";

export const todosRoute = userFactory
	.createApp()
	.get("/", async (c) => {
		const result = await findTodosByUserId(c.var.user.id);
		if (result instanceof Error) {
			return result.toResponse(c);
		}

		return c.json({ code: "SUCCESS", todos: result }, 200);
	})
	.post("/", validator("json", CreateTodoSchema), async (c) => {
		const data = c.req.valid("json");

		const result = await createTodo({
			userId: c.var.user.id,
			title: data.title,
			description: data.description,
			priority: data.priority,
			dueDate: data.dueDate,
		});
		if (result instanceof Error) {
			c.var.logger.error(result, "Error creating todo");
			return result.toResponse(c);
		}

		return c.json({ code: "SUCCESS", todo: result }, 201);
	})
	.get("/:id", async (c) => {
		const id = c.req.param("id");

		const result = await findTodoByIdAndUserId(id, c.var.user.id);
		if (result instanceof Error) {
			c.var.logger.error(result, "Error finding todo");
			return result.toResponse(c);
		}

		if (!result) {
			return c.json({ code: "NOT_FOUND", message: "Todo not found" }, 404);
		}

		return c.json({ code: "SUCCESS", todo: result }, 200);
	})
	.patch("/:id", validator("json", UpdateTodoSchema), async (c) => {
		const id = c.req.param("id");
		const data = c.req.valid("json");

		const result = await updateTodo(id, c.var.user.id, data);
		if (result instanceof Error) {
			c.var.logger.error(result, "Error updating todo");
			return result.toResponse(c);
		}

		if (!result) {
			return c.json({ code: "NOT_FOUND", message: "Todo not found" }, 404);
		}

		return c.json({ code: "SUCCESS", todo: result }, 200);
	})
	.delete("/:id", async (c) => {
		const id = c.req.param("id");

		const result = await deleteTodo(id, c.var.user.id);
		if (result instanceof Error) {
			c.var.logger.error(result, "Error deleting todo");
			return result.toResponse(c);
		}

		if (!result) {
			return c.json({ code: "NOT_FOUND", message: "Todo not found" }, 404);
		}

		return c.json({ code: "SUCCESS", todo: result }, 200);
	});

export type AppType = typeof todosRoute;

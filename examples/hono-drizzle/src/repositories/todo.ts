import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import { DatabaseError } from "@/lib/error";

export type Todo = typeof todos.$inferSelect;

export async function findTodosByUserId(userId: string): Promise<Todo[] | DatabaseError> {
	return db
		.select()
		.from(todos)
		.where(eq(todos.userId, userId))
		.all()
		.then((rows) => rows)
		.catch((cause) => {
			return new DatabaseError({
				operation: "findTodosByUserId",
				cause,
			});
		});
}

export async function findTodoById(id: string): Promise<Todo | null | DatabaseError> {
	return db
		.select()
		.from(todos)
		.where(eq(todos.id, id))
		.get()
		.then((todo) => todo ?? null)
		.catch((cause) => {
			return new DatabaseError({
				operation: "findTodoById",
				cause,
			});
		});
}

export async function findTodoByIdAndUserId(id: string, userId: string): Promise<Todo | null | DatabaseError> {
	return db
		.select()
		.from(todos)
		.where(and(eq(todos.id, id), eq(todos.userId, userId)))
		.get()
		.then((todo) => todo ?? null)
		.catch((cause) => {
			return new DatabaseError({
				operation: "findTodoByIdAndUserId",
				cause,
			});
		});
}

export async function createTodo(data: {
	userId: string;
	title: string;
	description?: string | null;
	priority?: number;
	dueDate?: Date | null;
}): Promise<Todo | DatabaseError> {
	return db
		.insert(todos)
		.values({
			userId: data.userId,
			title: data.title,
			description: data.description ?? null,
			priority: data.priority ?? 0,
			dueDate: data.dueDate ?? null,
		})
		.returning()
		.get()
		.then((todo) => todo)
		.catch((cause) => {
			return new DatabaseError({
				operation: "createTodo",
				cause,
			});
		});
}

export async function updateTodo(
	id: string,
	userId: string,
	data: {
		title?: string;
		description?: string | null;
		completed?: boolean;
		priority?: number;
		dueDate?: Date | null;
	}
): Promise<Todo | null | DatabaseError> {
	return db
		.update(todos)
		.set(data)
		.where(and(eq(todos.id, id), eq(todos.userId, userId)))
		.returning()
		.get()
		.then((todo) => todo ?? null)
		.catch((cause) => {
			return new DatabaseError({
				operation: "updateTodo",
				cause,
			});
		});
}

export async function deleteTodo(id: string, userId: string): Promise<Todo | null | DatabaseError> {
	return db
		.delete(todos)
		.where(and(eq(todos.id, id), eq(todos.userId, userId)))
		.returning()
		.get()
		.then((todo) => todo ?? null)
		.catch((cause) => {
			return new DatabaseError({
				operation: "deleteTodo",
				cause,
			});
		});
}

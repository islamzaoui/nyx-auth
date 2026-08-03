import { defineConfig } from "@rcmade/hono-docs";

export default defineConfig({
	tsConfigPath: "./tsconfig.json",
	openApi: {
		openapi: "3.0.0",
		info: { title: "Nyx Auth Todo App Example", version: "1.0.0" },
		servers: [{ url: "http://localhost:3000" }],
	},
	outputs: {
		openApiJson: "./generated/openapi.json",
	},
	apis: [
		{
			name: "Authentication",
			apiPrefix: "/auth",
			appTypePath: "src/routes/auth.route.ts",
			api: [
				{
					api: "/register",
					method: "post",
					summary: "Register",
				},
				{
					api: "/login",
					method: "post",
					summary: "Login",
				},
				{
					api: "/logout",
					method: "post",
					summary: "Logout",
				},
			],
		},
		{
			name: "Current User",
			apiPrefix: "/users/me",
			appTypePath: "src/routes/users/me.route.ts",
			api: [
				{
					api: "/",
					method: "get",
					summary: "Get the current authenticated user",
				},
			],
		},
		{
			name: "Todos",
			apiPrefix: "/todos",
			appTypePath: "src/routes/todos.route.ts",
			api: [
				{
					api: "/",
					method: "get",
					summary: "Get all todos for the current authenticated user",
				},
				{
					api: "/",
					method: "post",
					summary: "Create a new todo for the current authenticated user",
				},
				{
					api: "/{id}",
					method: "get",
					summary: "Get a todo by ID for the current authenticated user",
				},
				{
					api: "/{id}",
					method: "patch",
					summary: "Update a todo by ID for the current authenticated user",
				},
				{
					api: "/{id}",
					method: "delete",
					summary: "Delete a todo by ID for the current authenticated user",
				},
			],
		},
	],
});

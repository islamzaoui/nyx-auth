import z from "zod";

const EmailSchema = z.email("Invalid email address").toLowerCase();
const PasswordSchema = z
	.string("Password is required")
	.min(8, "Password must be at least 8 characters")
	.max(72, "Password cannot exceed 72 characters");

export const LoginSchema = z.object({
	email: EmailSchema,
	password: PasswordSchema,
});

export const RegisterSchema = z.object({
	name: z.string("Name is required").min(1, "Name must be at least 1 character").max(100, "Name cannot exceed 100 characters"),
	email: EmailSchema,
	password: PasswordSchema,
});

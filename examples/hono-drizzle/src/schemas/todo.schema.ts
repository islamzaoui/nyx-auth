import z from "zod";

const TitleSchema = z.string("Title is required").min(1, "Title must be at least 1 character").max(200, "Title cannot exceed 200 characters");

const DescriptionSchema = z.string().max(2000, "Description cannot exceed 2000 characters").nullable().optional();

const PrioritySchema = z.number().int().min(0, "Priority must be between 0 and 3").max(3, "Priority must be between 0 and 3").default(0);

const DueDateSchema = z.coerce.date().nullable().optional();

export const CreateTodoSchema = z.object({
	title: TitleSchema,
	description: DescriptionSchema,
	priority: PrioritySchema.optional(),
	dueDate: DueDateSchema,
});

export const UpdateTodoSchema = z.object({
	title: TitleSchema.optional(),
	description: DescriptionSchema,
	completed: z.boolean().optional(),
	priority: PrioritySchema.optional(),
	dueDate: DueDateSchema,
});

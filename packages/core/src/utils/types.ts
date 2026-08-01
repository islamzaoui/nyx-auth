/**
 * A session as exposed to the application.
 *
 * The base fields are managed by nyx-auth; `Attributes` holds the mapped
 * attributes returned by {@link NyxOptions.session.mapSessionAttributes}.
 * Usually derived with `typeof nyx.session.$infer` rather than imported.
 *
 * @typeParam Attributes - The mapped session attributes.
 */
export type Session<Attributes extends object = Record<never, never>> = {
	id: string;
	userId: string;
	createdAt: Date;
	lastVerifiedAt: Date;
} & Attributes;

/**
 * A user as exposed to the application.
 *
 * The base `id` field is managed by nyx-auth; `Attributes` holds the mapped
 * attributes returned by {@link NyxOptions.user.mapUserAttributes}. Usually
 * derived with `typeof nyx.user.$infer` rather than imported.
 *
 * @typeParam Attributes - The mapped user attributes.
 */
export type User<Attributes extends object = Record<never, never>> = {
	id: string;
} & Attributes;

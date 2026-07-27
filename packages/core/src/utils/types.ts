export type Session<Attributes extends object = Record<never, never>> = {
	id: string;
	userId: string;
	createdAt: Date;
	lastVerifiedAt: Date;
} & Attributes;

export type SessionWithToken<Attributes extends object = Record<never, never>> = {
	id: string;
	userId: string;
	token: string;
	createdAt: Date;
	lastVerifiedAt: Date;
} & Attributes;

export type User<Attributes extends object = Record<never, never>> = {
	id: string;
} & Attributes;

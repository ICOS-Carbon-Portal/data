import {Component, ComponentLifecycle} from "react";

/** Absolute URL as string */
export type UrlStr = string;

/** Base64-url string of Sha256 hash, most often truncated to first 18 bytes (24 characters) */
export type Sha256Str = string;

export interface KeyStrVal {
	[key: string]: string
}

export interface KeyAnyVal {
	[key: string]: any
}

/**	From https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-inference-in-conditional-types	*/
export type Unpacked<T> =
	T extends (infer U)[] ? U :
		T extends (...args: any[]) => infer U ? U :
			T extends Promise<infer U> ? U :
				T;

export type PromiseTypeParam<T> = T extends Promise<infer U> ? U : never;

/** Extract type inside a Promise coming from a function */
export type ThenArg<T> = T extends Promise<infer U>
	? U
	: T extends (...args: any[]) => Promise<infer U>
		? U
		: T;

export type ExtractPrototypes<C extends KeyAnyVal> = {
	[Key in keyof C['prototype']]: C['prototype'][Key]
}

export type PickClassFunctions<C> = Omit<ExtractPrototypes<C>, keyof Component | keyof ComponentLifecycle<never, never>>;

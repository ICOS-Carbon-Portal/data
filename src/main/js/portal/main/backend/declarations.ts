import {Component, ComponentLifecycle} from "react";

/** Absolute URL as string */
export type UrlStr = string;

/** Base64-url string of Sha256 hash, most often truncated to first 18 bytes (24 characters) */
export type Sha256Str = string;

/** Index signature for objects	*/
export type IdxSig<Value = string, Keys extends string | number | symbol = string> = {
	[Key in Keys]: Value
}

export type PromiseTypeParam<T> = T extends Promise<infer U> ? U : never;

/** Extract type inside a Promise coming from a function */
export type AsyncResult<F extends (...args: any[]) => Promise<any>> = F extends (...args: any[]) => Promise<infer R> ? R : never;

export type ExtractPrototypes<C extends IdxSig<any>> = {
	[Key in keyof C['prototype']]: C['prototype'][Key]
}

export type PickClassFunctions<C> = Omit<ExtractPrototypes<C>, keyof Component | keyof ComponentLifecycle<never, never>>;

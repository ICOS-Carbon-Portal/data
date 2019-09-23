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

import {Sha256Str, UrlStr} from "./backend/declarations";
import config from "./config";
import {CSSProperties} from "react";
import CartItem from "./models/CartItem";

export const getNewTimeseriesUrl = (items: CartItem[], xAxis: string) => {
	const objIds = items.map((item: CartItem) => getLastSegmentInUrl(item.dobj)).join();
	return items[0].getNewUrl({
		objId: objIds,
		x: xAxis,
		type: 'scatter'
	});
};

export const formatBytes = (bytes: number, decimals = 2) => {
	if (isNaN(bytes)) return "";
	if(bytes === 0) return '0 Bytes';

	const k = 1024,
		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

export const varType = (variable: any) => {
	const isString = typeof variable === 'string';
	if (isString) return 'string';

	const isArray = Array.isArray(variable);
	if (isArray) return 'array';

	const isPlainObject = variable !== null && typeof variable === 'object' && !Array.isArray(variable);
	if (isPlainObject) return 'object';

	return 'unknown';
};

export const isSmallDevice = () => {
	return window.innerWidth <= 768;
};

export const formatDateWithOptionalTime = (d: Date, offset = 0) => {
	// TODO: date can come in as string if it comes from cart view
	if (!d || !d.getUTCFullYear) return '';
	d.setUTCHours(d.getUTCHours() + offset);

	const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
	const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;

	return time === "00:00" ? `${date}` : `${date} ${time}`;
};

export const formatDateTime = (d: Date, offset = 0) => {
	d.setUTCHours(d.getUTCHours() + offset);

	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
};

const pad2 = (s: number | string) => {
	return ("0" + s).substr(-2, 2);
};

export const pick = <T extends Object, K extends keyof T>(source: T, ...keys: K[]): Pick<T, K> => {
	const target: any = {};

	keys.forEach((key) => {
		if (source.hasOwnProperty(key)) {
			target[key as string] = source[key];
		}
	});

	return target;
};

export function throwError(msg: string): never{
	throw new Error(msg);
}

export function wholeStringRegExp(anyRegex: string): RegExp {
	const prologue = anyRegex.startsWith('^') ? '' : '^';
	const epilogue = anyRegex.endsWith("$") ? '' : '$';

	return new RegExp([prologue, anyRegex, epilogue].join(''));
}

export function isDefined<T>(x: T | undefined): x is T{
	return x !== undefined;
}

export function getLastSegmentInUrl(url: UrlStr): string | Sha256Str {
	// Return everything after the last slash (usually an object id) in the URL
	const idx = url.lastIndexOf('/');
	if (idx === -1) throw new Error(`Cannot get last segment from '${url}'`);

	return url.substr(idx + 1);
}

export function getLastSegmentsInUrls(urls: UrlStr[]): (string | Sha256Str)[] {
	// Convert an array of URLs to an array of last URL segments (usually object ids)
	return urls.map(url => getLastSegmentInUrl(url));
}

function getUrlFromPid(pid: Sha256Str): UrlStr {
	return config.objectUriPrefix[config.envri] + pid;
}

export function getUrlsFromPids(pids: Sha256Str[]): UrlStr[] {
	return pids.map(pid => getUrlFromPid(pid));
}

export type OptFunction<I, O> = <IOPT extends I | undefined>(io: IOPT) => (IOPT extends undefined ? undefined : O)

//converts a regular single-argument function to a function that accepts optional value and returns optional result
export function liftToOptional<I, O>(f: (i:I) => O): OptFunction<I, O> {
	return io0 => {
		const io: I | undefined = io0
		if(io === undefined) return undefined as any
		return f(io)
	}
}

export const linesToShowStyle = (linesToShow: number): CSSProperties => ({
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	display: '-webkit-box',
	WebkitLineClamp: linesToShow,
	WebkitBoxOrient: 'vertical'
});

export const areEqual = <T>(arr1: T[], arr2: T[]) => {
	if (arr1.length !== arr2.length)
		return false;
	
	for (let i = 0; i < arr1.length; i++){
		if (arr1[i] !== arr2[i])
			return false;
	}
	
	return true;
};

export const distinct = <T>(...arrs: T[][]): T[] => {
	return [...new Set(arrs.flatMap(arr => arr))];
};

type SetOperation = <T>(arr1: T[], arr2: T[]) => T[]
export const intersection: SetOperation = (arr1, arr2) => {
	// All elements that are in both arr1 and arr2
	return arr1.filter(val => arr2.includes(val));
};

export const difference: SetOperation = (arr1, arr2) => {
	// All elements from arr1 that are not in arr2
	return arr1.filter(val => !arr2.includes(val));
};

export const symmetricalDifference: SetOperation = (arr1, arr2) => {
	// All elements from arr1 that are not in arr2 and all element from arr2 that are not in arr1
	return difference(arr1, arr2).concat(difference(arr2, arr1));
};

export const union: SetOperation = (arr1, arr2) => {
	// All unique elements from arr1 and arr2
	return distinct(arr1, arr2);
};

export const uppercaseFirstChar = (txt: string) => {
	return txt.charAt(0).toUpperCase() + txt.slice(1);
};

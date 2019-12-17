export type Int = number & { __int__: void };
export const roundToInt = (num: number): Int => Math.round(num) as Int;
export const toInt = (value: string): Int => {
	return Number.parseInt(value) as Int;
};
export const isInt = (num: number): num is Int =>  num % 1 === 0;

declare module 'icos-cp-spatial'{

	function linearInterpolation(domain: number[], range: number[]): (x: number) => number

	type RGBA = [number, number, number, number]

	function rgbaInterpolation(domain: number[], colors: RGBA[]): (x: number) => RGBA
}
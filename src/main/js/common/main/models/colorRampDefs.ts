import { RGBA } from "icos-cp-spatial";

export type RampDomain = Array<-1 | 0 | 1>

export interface ColorRamp{
	name: string
	domain: RampDomain
	colors: RGBA[]
}

const colorRampDefs: ColorRamp[] = [
	{
		name: 'blueYellowRed',
		domain: [-1, 0, 1],
		colors: [[44, 123, 182, 255], [255, 255, 191, 255], [215, 25, 28, 255]]
	},
	{
		name: 'BrBG',
		domain: [-1, 0, 1],
		colors: [[90, 180, 172, 255], [245, 245, 245, 255], [216, 179, 101, 255]]
	},
	{
		name: 'PRGn',
		domain: [-1, 0, 1],
		colors: [[127, 191, 123, 255], [247, 247, 247, 255], [175, 141, 195, 255]]
	},
	{
		name: 'yellowRed',
		domain: [0, 1],
		colors: [[255, 255, 178, 255], [189, 0, 38, 255]]
	},
	{
		name: 'GnBu',
		domain: [0, 1],
		colors: [[224, 243, 219, 255], [67, 162, 202, 255]]
	},
	{
		name: 'Greys',
		domain: [0, 1],
		colors: [[240, 240, 240, 255], [99, 99, 99, 255]]
	}
]

export const colorRamps: ColorRamp[] = colorRampDefs.flatMap(cr => [
	cr,
	{
		name: cr.name + '-rev',
		domain: cr.domain,
		colors: cr.colors.slice().reverse()
	}
])

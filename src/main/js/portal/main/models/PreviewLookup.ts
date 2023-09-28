import config, {PreviewType} from '../config';
import CompositeSpecTable from './CompositeSpecTable';
import {UrlStr} from '../backend/declarations';
import { PreviewOption, previewVarCompare } from './Preview';
import { LabelLookup } from './State';

interface PreviewTypeInfo{
	type: PreviewType
}

interface TimeSeriesPreviewInfo extends PreviewTypeInfo{
	type: "TIMESERIES"
	options: PreviewOption[]
}

interface OtherPreviewInfo extends PreviewTypeInfo{
	type: "NETCDF" | "MAPGRAPH" | "PHENOCAM"
}

type Table = Record<string,PreviewInfo | undefined>
type VarInfo = Record<string,boolean>

export type PreviewInfo = TimeSeriesPreviewInfo | OtherPreviewInfo

export default class PreviewLookup{
	constructor(public readonly table: Table, public readonly varInfo: VarInfo) {}

	static init(specTable: CompositeSpecTable, labelLookup: LabelLookup): PreviewLookup {
		return new PreviewLookup(getTable(specTable, labelLookup), {})
	}

	withVarInfo(varInfo: VarInfo) {
		return new PreviewLookup(this.table, varInfo);
	}

	forDataObjSpec(spec: UrlStr): PreviewInfo | undefined {
		return this.table[spec]
	}

	hasVarInfo(dobj: UrlStr): boolean | undefined {
		return this.varInfo[dobj];
	}

}

function getTable(specTable: CompositeSpecTable, labelLookup: LabelLookup): Table {

	const specFormats: {[spec: string]: string} = {}
	const specToCols: {[spec: string]: Array<{varTitle: string, valType: string}>} = {}
	const table: Table = {}

	specTable.basics.rows.forEach(({ spec, format }) => {
		if (typeof spec === 'string' && typeof format === 'string') {
			specFormats[spec] = format
		}
	})

	specTable.columnMeta.rows.forEach(({ spec, varTitle, valType }) => {
		if (typeof spec === 'string' && typeof varTitle === 'string' && typeof valType === 'string') {
			const oldCols = specToCols[spec]
			const cols = oldCols ?? []
			cols.push({varTitle, valType})
			if(!oldCols) specToCols[spec] = cols
		}
	})

	function latLonPresent(cols: Array<{varTitle: string, valType: string}>): boolean {
		return !!cols.find(col => col.valType === config.mapGraph.latValueType || col.valType === config.mapGraph.lonValueType)
	}

	Object.entries(specFormats).forEach(([spec, format]) => {

		const cols = specToCols[spec] ?? []

		if (format === config.netCdfFormat)
			table[spec] = { type: "NETCDF" }

		else if(config.imageMultiZipFormats.includes(format))
			table[spec] = { type: "PHENOCAM"}

		else if (config.mapGraph.formats.includes(format) && latLonPresent(cols))
			table[spec] = { type: "MAPGRAPH" }

		else if (cols.length > 0) {
			const options = cols.map(({varTitle, valType}) => {
				const valTypeLabel = labelLookup[valType].label
				return { varTitle, valTypeLabel }
			})
			options.sort(previewVarCompare)
			table[spec] = { type: "TIMESERIES", options}
		}
	})

	return table
}

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
	specTable.basics.rows.forEach(({ spec, format }) => {
		if (typeof spec === 'string' && typeof format === 'string') {
			specFormats[spec] = format
		}
	})

	const table: Table = {}

	Object.entries(specFormats).forEach(([spec, format]) => {
		if (format === config.netCdfFormat)
			table[spec] = { type: "NETCDF" };
		else if(config.imageMultiZipFormats.includes(format))
			table[spec] = { type: "PHENOCAM"};
	});

	const tsTable: {[x: string]: TimeSeriesPreviewInfo} = {};

	const specsWithLat = new Set<string>();
	const specsWithLon = new Set<string>();

	specTable.columnMeta.rows.forEach(({ spec, varTitle, valType }) => {
		if (typeof spec === 'string' && typeof varTitle === 'string' && typeof valType === 'string' && !table[spec]) {
			const pInfo = tsTable[spec] ?? { type: "TIMESERIES", options: [] };
			tsTable[spec] = pInfo
			const valTypeLabel = labelLookup[valType].label;
			pInfo.options.push({ varTitle, valTypeLabel });
			if(valType === config.mapGraph.latValueType) specsWithLat.add(spec);
			if(valType === config.mapGraph.lonValueType) specsWithLon.add(spec);
		}
	});

	Object.values(tsTable).forEach(pInfo => {
		pInfo.options.sort(previewVarCompare)
	});

	Object.entries(specFormats).forEach(([spec, format]) => {
		if (config.mapGraph.formats.includes(format) && specsWithLat.has(spec) && specsWithLon.has(spec))
			table[spec] = { type: "MAPGRAPH" };
	});

	return {...table, ...tsTable};
};

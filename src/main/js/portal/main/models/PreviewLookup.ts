import config, {PreviewType} from '../config';
import CompositeSpecTable from './CompositeSpecTable';
import {UrlStr} from '../backend/declarations';
import { PreviewOption } from './Preview';
import { LabelLookup } from './State';
import { Dict } from '../../../common/main/types';

interface PreviewTypeInfo{
	type: PreviewType
}

interface TimeSeriesPreviewInfo extends PreviewTypeInfo{
	type: "TIMESERIES"
	options: PreviewOption[]
}

interface OtherPreviewInfo extends PreviewTypeInfo{
	type: "NETCDF" | "MAPGRAPH"
}

type Table = Dict<PreviewInfo | undefined>
type VarInfo = Dict<boolean>

export type PreviewInfo = TimeSeriesPreviewInfo | OtherPreviewInfo

export default class PreviewLookup{
	readonly table: Table = {};
	readonly varInfo: VarInfo = {};

	constructor(specTable?: CompositeSpecTable, labelLookup?: LabelLookup, table?: Table, varInfo?: VarInfo) {
		if (specTable && labelLookup) {
			this.table = getTable(specTable, labelLookup);

		} else if (table && varInfo) {
			this.table = table;
			this.varInfo = varInfo;

		} else {
			throw new Error("Illegal call to PreviewLookup");
		}
	}

	withVarInfo(varInfo: VarInfo) {
		return new PreviewLookup(undefined, undefined, this.table, varInfo);
	}

	forDataObjSpec(spec: UrlStr): PreviewInfo | undefined {
		return this.table[spec]
	}

	hasVarInfo(dobj: UrlStr): boolean | undefined {
		return this.varInfo[dobj];
	}

}

const getTable = (specTable: CompositeSpecTable, labelLookup: LabelLookup): Table => {
	const table: Table = {};

	const specsWithLat = new Set<string>();
	const specsWithLon = new Set<string>();

	specTable.columnMeta.rows.forEach(({ spec, varTitle, valType }) => {
		if (typeof spec === 'string' && typeof varTitle === 'string' && typeof valType === 'string') {
			let defaultInfo: TimeSeriesPreviewInfo = { type: "TIMESERIES", options: [] };
			const currentInfo = table[spec];
			const info = (currentInfo !== undefined && currentInfo.type === 'TIMESERIES') ? currentInfo : defaultInfo;
			if (info === defaultInfo) table[spec] = info;
			const valTypeLabel = labelLookup[valType].label;
			info.options.push({ varTitle, valTypeLabel });
			if(valType === config.mapGraph.latValueType) specsWithLat.add(spec);
			if(valType === config.mapGraph.lonValueType) specsWithLon.add(spec);
		}
	});

	specTable.basics.rows.forEach(({ spec, format }) => {
		if (typeof spec === 'string' && typeof format === 'string') {
			if (format === config.netCdfFormat)
				table[spec] = { type: "NETCDF" };
			else if (
				config.mapGraph.formats.includes(format) &&
				specsWithLat.has(spec) && specsWithLon.has(spec)
			) table[spec] = { type: "MAPGRAPH" };
		}
	});

	return table;
};

import config, {PreviewType} from '../config';
import CompositeSpecTable from './CompositeSpecTable';
import {IdxSig, UrlStr} from '../backend/declarations';
import { PreviewOption } from './Preview';

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

type Table = IdxSig<PreviewInfo | undefined>
type VarInfo = IdxSig<boolean>

export type PreviewInfo = TimeSeriesPreviewInfo | OtherPreviewInfo

export default class PreviewLookup{
	readonly table: Table = {};
	readonly varInfo: VarInfo = {};

	constructor(specTable?: CompositeSpecTable, labelLookup?: IdxSig, table?: Table, varInfo?: VarInfo) {
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

const getTable = (specTable: CompositeSpecTable, labelLookup: IdxSig): Table => {
	const table: Table = {};

	specTable.columnMeta.rows.forEach(({ spec, varTitle, valType }) => {
		if (typeof spec === 'string' && typeof varTitle === 'string' && typeof valType === 'string') {
			let defaultInfo: TimeSeriesPreviewInfo = { type: "TIMESERIES", options: [] };
			const currentInfo = table[spec];
			const info = (currentInfo !== undefined && currentInfo.type === 'TIMESERIES') ? currentInfo : defaultInfo;
			if (info === defaultInfo) table[spec] = info;
			const valTypeLabel = labelLookup[valType];
			info.options.push({ varTitle, valTypeLabel });
		}
	});

	specTable.basics.rows.forEach(({ spec, format }) => {
		if (typeof spec === 'string' && typeof format === 'string') {
			if (format === config.netCdfFormat) table[spec] = { type: "NETCDF" };
			else if (config.mapGraphFormats.includes(format)) table[spec] = { type: "MAPGRAPH" };
		}
	});

	return table;
};

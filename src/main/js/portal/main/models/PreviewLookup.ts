import config, {type PreviewType} from '../config';
import type CompositeSpecTable from './CompositeSpecTable';
import {type UrlStr} from '../backend/declarations';
import {type PreviewOption, previewVarCompare} from './Preview';
import {type LabelLookup} from './State';

type PreviewTypeInfo = {
	type: PreviewType
};

type TimeSeriesPreviewInfo = {
	type: "TIMESERIES"
	options: PreviewOption[]
} & PreviewTypeInfo;

type OtherPreviewInfo = {
	type: "NETCDF" | "MAPGRAPH" | "PHENOCAM"
} & PreviewTypeInfo;

type Table = Record<string, PreviewInfo | undefined>;
type VarInfo = Record<string, boolean>;

export type PreviewInfo = TimeSeriesPreviewInfo | OtherPreviewInfo;

export default class PreviewLookup {
	constructor(public readonly table: Table, public readonly varInfo: VarInfo) {}

	static init(specTable: CompositeSpecTable, labelLookup: LabelLookup): PreviewLookup {
		return new PreviewLookup(getTable(specTable, labelLookup), {});
	}

	withVarInfo(varInfo: VarInfo) {
		return new PreviewLookup(this.table, varInfo);
	}

	forDataObjSpec(spec: UrlStr): PreviewInfo | undefined {
		return this.table[spec];
	}

	hasVarInfo(dobj: UrlStr): boolean | undefined {
		return this.varInfo[dobj];
	}
}

function getTable(specTable: CompositeSpecTable, labelLookup: LabelLookup): Table {
	const specFormats: Record<string, string> = {};
	const specToCols: Record<string, Array<{varTitle: string, valType: string}>> = {};
	const table: Table = {};

	specTable.basics.rows.forEach(({spec, format}) => {
		if (typeof spec === 'string' && typeof format === 'string') {
			specFormats[spec] = format;
		}
	});

	specTable.columnMeta.rows.forEach(({spec, varTitle, valType}) => {
		if (typeof spec === 'string' && typeof varTitle === 'string' && typeof valType === 'string') {
			const oldCols = specToCols[spec];
			const cols = oldCols ?? [];
			cols.push({varTitle, valType});
			if (!oldCols) {
				specToCols[spec] = cols;
			}
		}
	});

	function latLonPresent(cols: Array<{varTitle: string, valType: string}>): boolean {
		return cols.some(col => col.valType === config.mapGraph.latValueType)
			&& cols.some(col => col.valType === config.mapGraph.lonValueType);
	}

	Object.entries(specFormats).forEach(([spec, format]) => {
		const cols = specToCols[spec] ?? [];

		if (format === config.netCdf.format) {
			table[spec] = {type: "NETCDF"};
		} else if (config.imageMultiZipFormats.includes(format)) {
			table[spec] = {type: "PHENOCAM"};
		} else if (config.mapGraph.formats.includes(format) && latLonPresent(cols)) {
			table[spec] = {type: "MAPGRAPH"};
		} else if (cols.length > 0) {
			const options = cols.map(({varTitle, valType}) => {
				const valTypeLabel = labelLookup[valType].label;
				return {varTitle, valTypeLabel};
			});
			options.sort(previewVarCompare);
			table[spec] = {type: "TIMESERIES", options};
		}
	});

	return table;
}

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

export type PreviewInfo = TimeSeriesPreviewInfo | OtherPreviewInfo

export default class PreviewLookup{
	private readonly table: {[key: string]: PreviewInfo | undefined};

	constructor(specTable: CompositeSpecTable, labelLookup: IdxSig<string, string>){
		this.table = {};

		specTable.columnMeta.rows.forEach(({spec, varTitle, valType}) => {
			if(typeof spec === 'string' && typeof varTitle === 'string' && typeof valType === 'string'){
				let defaultInfo: TimeSeriesPreviewInfo = {type: "TIMESERIES", options: []};
				const currentInfo = this.table[spec];
				const info = (currentInfo !== undefined && currentInfo.type === 'TIMESERIES') ? currentInfo : defaultInfo;
				if (info === defaultInfo) this.table[spec] = info;
				const valTypeLabel = labelLookup[valType];
				info.options.push({varTitle, valTypeLabel});
			}
		});

		specTable.basics.rows.forEach(({spec, format}) => {
			if(typeof spec === 'string' && typeof format === 'string'){
				if (format === config.netCdfFormat) this.table[spec] = {type: "NETCDF"};
				else if (config.mapGraphFormats.includes(format)) this.table[spec] = {type: "MAPGRAPH"};
			}
		})
	}

	forDataObjSpec(spec: UrlStr): PreviewInfo | undefined {
		return this.table[spec]
	}

}

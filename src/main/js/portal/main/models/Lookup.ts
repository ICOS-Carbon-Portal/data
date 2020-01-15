import config, {PreviewType} from '../config';
import CompositeSpecTable from './CompositeSpecTable';
import {KeyStrVal, UrlStr} from '../backend/declarations';

interface PreviewTypeInfo{
	type: PreviewType
}

interface TimeSeriesPreviewInfo extends PreviewTypeInfo{
	type: "TIMESERIES"
	options: {
		colTitle: string
		valTypeLabel: string
	}[]
}

interface OtherPreviewInfo extends PreviewTypeInfo{
	type: "NETCDF" | "MAPGRAPH"
}

type PreviewInfo = TimeSeriesPreviewInfo | OtherPreviewInfo

export default class Lookup{
	readonly table: {[key: string]: PreviewInfo | undefined};

	constructor(specTable: CompositeSpecTable, labelLookup: KeyStrVal){
		this.table = {};

		specTable.columnMeta.rows.forEach(({spec, colTitle, valType}) => {
			if(typeof spec === 'string' && typeof colTitle === 'string' && typeof valType === 'string'){
				let defaultInfo: TimeSeriesPreviewInfo = {type: "TIMESERIES", options: []};
				const currentInfo = this.table[spec];
				const info = (currentInfo !== undefined && currentInfo.type === 'TIMESERIES') ? currentInfo : defaultInfo;
				if (info === defaultInfo) this.table[spec] = info;
				const valTypeLabel = labelLookup[valType];
				info.options.push({colTitle, valTypeLabel});
			}
		});

		specTable.basics.rows.forEach(({spec, format}) => {
			if(typeof spec === 'string' && typeof format === 'string'){
				if (format === config.netCdfFormat) this.table[spec] = {type: "NETCDF"};
				else if (config.mapGraphFormats.includes(format)) this.table[spec] = {type: "MAPGRAPH"};
			}
		})
	}

	getSpecLookup(spec: UrlStr): PreviewInfo | undefined {
		return this.table[spec]
	}

	getSpecLookupType(spec: UrlStr): PreviewType | undefined {
		return this.table[spec]?.type
	}

}

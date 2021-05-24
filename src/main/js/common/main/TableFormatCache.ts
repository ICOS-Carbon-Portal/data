import {ObjectSpecConfig} from "./sparqlQueries";
import {TableFormat, tableFormatForSpecies} from "icos-cp-backend";

export default class TableFormatCache {
	private readonly cache: {[key: string]: Promise<TableFormat>} = {};

	constructor(private readonly config: ObjectSpecConfig) {}

	getTableFormat(specUri: string): Promise<TableFormat>{
		const current: Promise<TableFormat> | undefined = this.cache[specUri];
		if (current) return current;

		const newTf = tableFormatForSpecies(specUri, this.config);
		this.cache[specUri] = newTf;

		return  newTf;
	}

	isInCache(specUri: string) {
		return this.cache[specUri] !== undefined;
	}
}

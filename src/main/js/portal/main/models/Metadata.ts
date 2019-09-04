interface ILabelUriPair {
	label: string;
	uri: string;
}

interface IProps {
	accessUrl: string;
	citationString: string;
	coverageGeoJson: string;
	fileName: string;
	hash: string;
	parentCollections: ILabelUriPair;
	pid: string;
	doi: string;
	nextVersion: string[];
	previousVersion: string[];
	size: number;
	specificInfo: {
		acquisition: {
			instrument: string;
			interval: {
				start: string;
				stop: string;
			};
			samplingHeight: number;
			station: {
				coverage: {
					alt: number;
					lat: number;
					lon: number;
				};
				id: string;
				name: string;
				org: {
					name: string;
					self: {
						uri: string;
					}
				}
			}
		};
		nRows: number;
		productionInfo: {
			contributors: [];
			creator: {
				name: string;
				self: ILabelUriPair;
			};
			dateTime: string;
			host: {
				name: string;
				self: ILabelUriPair;
			};
			sources: [];
		}
	};
	specification: {
		dataLevel: number;
		datasetSpec: ILabelUriPair;
		encoding: ILabelUriPair;
		format: ILabelUriPair;
		project: ILabelUriPair;
		self: ILabelUriPair;
		theme: {
			icon: string;
			markerIcon: string;
			self: ILabelUriPair;
		};
	};
	submission: {
		start: string;
		stop: string;
		submitter: {
			name: string;
			self: ILabelUriPair;
		}
	};
	id: string;
}

export default class Metadata {
	constructor(props: IProps) {
		Object.assign(this, props);
	}

	get serialize() {
		return Object.assign({}, this);
	}
}

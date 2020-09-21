export default class BackendSource {
	constructor(selectedSource) {
		this._sources = ['restheart', 'postgres'];
		this._isVisible = location.search === "?pg";
		this._selectedSource = selectedSource
			? this._sources[this._sources.indexOf(selectedSource)]
			: this._sources[1];
	}

	get source() {
		return this._selectedSource;
	}

	get isVisible() {
		return this._isVisible;
	}

	get sources() {
		return this._sources;
	}

	setSource(source) {
		if (this._sources.includes(source)) {
			return new BackendSource(source);
		} else {
			throw new Error(`'${source}' is not a valid mode (${this._sources.join(', ')})`);
		}
	}
}
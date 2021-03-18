const allViews = ['downloads', 'previews', 'library'];

export default class ViewMode{
	constructor(envri, selectedMode) {
		this.envri = envri;
		this._modes = envri === "ICOS"
			? allViews
			: allViews.filter(v => v !== "library");
		this._selectedMode = selectedMode
			? this._modes[this._modes.indexOf(selectedMode)]
			: this._modes[0];
	}

	get mode(){
		return this._selectedMode;
	}

	get modes(){
		return this._modes;
	}

	setMode(mode){
		if (this._modes.includes(mode)) {
			return new ViewMode(this.envri, mode);
		} else {
			throw new Error(`'${mode}' is not a valid mode (${this._modes.join(', ')})`);
		}
	}
}
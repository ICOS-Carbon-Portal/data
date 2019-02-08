export default class ViewMode{
	constructor(selectedMode){
		this._modes = ['downloads', 'previews'];
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
			return new ViewMode(mode);
		} else {
			throw new Error(`'${mode}' is not a valid mode (${this._modes.join(', ')})`);
		}
	}
}
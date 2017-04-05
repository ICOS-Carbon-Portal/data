import 'babel-polyfill';

export default class Params {
	constructor(){
		this._params = this.getParams(window.location.search);
	}

	getParams(search){
		const params = new URLSearchParams(search);

		if (params.has('objId') && params.has('x') && params.has('y')) {
			return {
				objId: params.get('objId'),
				x: params.get('x'),
				y: params.get('y')
			};
		} else {
			return undefined;
		}
	}

	get isValidParams(){
		return !!this._params;
	}

	get objId(){
		return this.isValidParams ? this._params.objId : undefined;
	}

	get x(){
		return this.isValidParams ? this._params.x : undefined;
	}

	get y(){
		return this.isValidParams ? this._params.y : undefined;
	}


}
import 'babel-polyfill';

export default class Params {
	constructor(search){
		this._params = this.getParams(search);
	}

	getParams(search){
		const params = new URLSearchParams(search);

		if (params.has('objId') && params.has('x') && params.has('y')) {
			return {
				objId: params.get('objId'),
				x: params.get('x'),
				y: params.get('y'),
				type: params.get('type') //optional
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

	get type(){
		return this.isValidParams ? this._params.type : undefined;
	}
}
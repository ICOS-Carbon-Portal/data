export default class Params {
	constructor(search, required){
		this._params = this.parseSearch(search);
		this.isValidParams = this.validateSearch(required);
	}

	parseSearch(search) {
		return window.URLSearchParams
			? new URLSearchParams(search)
			: search;
	}

	validateSearch(required){
		if (window.URLSearchParams) {
			return required.reduce((acc, curr) => acc * this._params.has(curr), true);
		} else {
			return required.reduce((acc, curr) => {
				const regex = new RegExp('[\\?&]' + curr + '=([^&#]*)');
				const results = regex.exec(this._params);
				return acc * (results !== null);
			}, true);
		}
	}

	get(param){
		// A non existing search param -> return null
		// An existing search param that has value null or nothing -> return undefined
		// An existing search param that has a value other than null -> return the value
		if (window.URLSearchParams) {
			return this._params.has(param)
				? this._params.get(param) && this._params.get(param) !== 'null' ? this._params.get(param) : undefined
				: null;
		} else {
			return this.getUrlParameter(param);
		}
	}

	getUrlParameter(param) {
		param = param.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
		const regex = new RegExp('[\\?&]' + param + '=([^&#]*)');
		const results = regex.exec(this._params);
		return results === null
			? null
			: results[1] === '' || results[1] === 'null'
				? undefined
				: decodeURIComponent(results[1].replace(/\+/g, ' '));
	}
}

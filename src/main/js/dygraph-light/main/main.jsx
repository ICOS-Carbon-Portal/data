import 'babel-polyfill';
import config from '../../common/main/config';
import {getBinTable} from './backend';


class App{
	constructor(config, search){
		this._config = config;
		this._params = this.getParams(search);
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

	get isValidURL(){
		return !!this._params;
	}

	get config(){
		return this.isValidURL ? this._config : undefined;
	}

	get objId(){
		return this.isValidURL ? this._params.objId : undefined;
	}

	get x(){
		return this.isValidURL ? this._params.x : undefined;
	}

	get y(){
		return this.isValidURL ? this._params.y : undefined;
	}
}

const app = new App(config, window.location.search);

main();

function main() {
	console.log({config: app.config});

	getBinTable(app.config, app.x, app.y, app.objId)
		.then(binTable => {
			console.log({binTable}),
			err => dispatch(failWithError(err))
		});
}
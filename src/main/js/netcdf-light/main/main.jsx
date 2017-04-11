import config from '../../common/main/config';
import App from './App';
import Params from './models/Params';

new App(
	config,
	new Params(window.location.search, ['service', 'varName', 'date', 'elevation'])
);

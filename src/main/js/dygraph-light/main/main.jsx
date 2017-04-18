import config from '../../common/main/config';
import App from './App';
import Params from '../../common/models/Params';

new App(config, new Params(window.location.search, ['objId', 'x', 'y']));

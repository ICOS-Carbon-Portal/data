//TODO: IE has problems with Promise in this app
import config from '../../common/main/config';
import App from './App';
import UrlSearchParams from '../../common/main/models/UrlSearchParams';

new App(config, new UrlSearchParams(window.location.search, ['objId', 'x', 'y']));

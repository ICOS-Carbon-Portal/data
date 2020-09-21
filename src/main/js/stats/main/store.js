import 'babel-polyfill';
import { createStore, applyMiddleware,compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import { init } from './actions';


const opts = window.location.hostname.startsWith('local-')
	? {trace: true}
	: {};
const REDUX_DEVTOOLS_EXTENSION_COMPOSE = window['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__'];
const composeEnhancers = REDUX_DEVTOOLS_EXTENSION_COMPOSE
	? REDUX_DEVTOOLS_EXTENSION_COMPOSE(opts)
	: compose;

const enhancer = composeEnhancers(
	applyMiddleware(thunkMiddleware)
);

export default function() {
	const store = createStore(reducer, undefined, enhancer);
	store.dispatch(init);
	return store;
}

import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {init} from './actions';


export default function(){
	const store = createStore(reducer, undefined, applyMiddleware(thunkMiddleware));
	store.dispatch(init());

	return store;
}

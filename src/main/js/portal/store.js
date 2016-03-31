import { createStore, applyMiddleware } from 'redux'
import thunkMiddleware from 'redux-thunk'
import reducer from './reducer'
import {routeUpdated} from './actions'

const store = createStore(reducer, {}, applyMiddleware(thunkMiddleware));

export default function(){
	store.dispatch(routeUpdated());
	return store;
}


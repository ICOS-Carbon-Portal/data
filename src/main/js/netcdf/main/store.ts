import { createStore, applyMiddleware, compose, Dispatch, Action, Middleware, AnyAction } from 'redux';
import thunkMiddleware from 'redux-thunk';
import {configureStore} from '@reduxjs/toolkit';
import reducer from './reducer';
import { State } from './models/State';
import { init } from "./actions";
import { ActionPayload, NetCDFPlainAction } from './actionDefinitions';


const store = configureStore({reducer});

export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch;

export default store

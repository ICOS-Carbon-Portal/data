import {configureStore} from '@reduxjs/toolkit';
import reducer from './reducer';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { State } from './models/State';


const store = configureStore({
	reducer,
	middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false})
});

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<State> = useSelector;

export default store;

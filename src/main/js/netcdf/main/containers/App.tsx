import React, { Component, useEffect } from 'react';
//import { connect } from 'react-redux';
import Map from '../components/Map';
import {fetchInitialData} from '../actions';
import {AnimatedToasters} from 'icos-cp-toaster';
//import { RangeFilter, State, TimeserieParams } from '../models/State';
//import { NetCDFDispatch } from '../store';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppDispatch, useAppSelector } from '../store';


export default function App() {
	const dispatch = useAppDispatch();

	useEffect(() => {
		dispatch(fetchInitialData());
	}, []);

	const toasterData = useAppSelector((state) => state.toasterData);

	return <>
		{toasterData
			? <AnimatedToasters autoClose={false} toasterData={toasterData} />
			: null
		}
		<ErrorBoundary>
			<Map />
		</ErrorBoundary>
	</>;
}

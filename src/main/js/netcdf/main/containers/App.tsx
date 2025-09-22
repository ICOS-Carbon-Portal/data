import React, { useEffect } from 'react';
import Map from '../components/Map';
import {fetchInitialData} from '../actions';
import {AnimatedToasters} from 'icos-cp-toaster';
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

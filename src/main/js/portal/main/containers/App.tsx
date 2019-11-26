import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart';
import Preview from '../components/preview/Preview';
import Metadata, { MetadataTitle } from './Metadata';
import ErrorBoundary from '../components/ErrorBoundary';
import {failWithError, updateRoute, updateCheckedObjectsInCart, setPreviewUrl, storeTsPreviewSetting} from '../actions';
import config from '../config';
import {MetaDataObject, Routes, State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import Cart from "../models/Cart";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type AppProps = StateProps & DispatchProps;

export class App extends Component<AppProps> {
	constructor(props: AppProps){
		super(props);
	}

	handleRouteClick(newRoute: string){
		this.props.updateCheckedObjectsInCart([]);
		this.props.updateRoute(newRoute);
	}

	componentWillReceiveProps(nextProps: AppProps) {
		if (nextProps.route !== this.props.route) {
			window.scrollTo(0, 0);
		}
	}

	render(){
		const props = this.props;

		return (
			<div style={{marginTop: 10}}>

				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div className="row page-header">

					<Title route={props.route} metadata={props.metadata} />

					<div className="col-md-3 text-right" style={{marginTop: 30}}>
						<SwitchRouteBtn
							route={props.route}
							cart={props.cart}
							handleRouteClick={this.handleRouteClick.bind(this)}
						/>
					</div>
				</div>

				<ErrorBoundary failWithError={props.failWithError}>
					<Route {...props} />
				</ErrorBoundary>
			</div>
		);
	}
}

const Title = (props: {route: Routes, metadata?: MetaDataObject & {id: UrlStr}}) => {

	switch(props.route) {
		case config.ROUTE_SEARCH:
			return (
				<h1 className="col-md-9">
					{config.envri} data portal
					<small> Search, preview, download data objects</small>
				</h1>
			);

		case config.ROUTE_METADATA:
			return (
				<div className="col-md-9">{MetadataTitle(props.metadata)}</div>
			);

		default:
			return <div className="col-md-9" />;
	}
};

interface ButtonProps {
	handleRouteClick: (newRoute: string) => void
	cart: Cart
	route: Routes
}

const SwitchRouteBtn = (props: ButtonProps) => {
	switch(props.route){

		case config.ROUTE_SEARCH:
			return <SearchBtn {...props} />;

		case config.ROUTE_CART:
			return null;

		default:
			return <SearchBtn {...props} />;
	}
};

const SearchBtn = (props: ButtonProps) => {
	const {cart, handleRouteClick} = props;
	const colCount = cart.count;

	return (
		<button className="btn btn-primary" onClick={() => handleRouteClick(config.ROUTE_CART)}>
			View data cart
			<span style={{marginLeft: 5}} className="badge">
				{colCount} {colCount === 1 ? ' item' : ' items'}
			</span>
		</button>
	);
};

const Route = (props: AppProps) => {
	switch(props.route){
		case config.ROUTE_SEARCH:
			return <Search />;

		case config.ROUTE_CART:
			return <DataCart />;

		case config.ROUTE_PREVIEW:
			return (
				<Preview
					preview={props.preview}
					cart={props.cart}
					extendedDobjInfo={props.extendedDobjInfo}
					tsSettings={props.tsSettings}
					setPreviewUrl={props.setPreviewUrl}
					storeTsPreviewSetting={props.storeTsPreviewSetting}
				/>);

		case config.ROUTE_METADATA:
			return <Metadata />;

		default:
			return <Search />;
	}
};

function stateToProps(state: State){
	return {
		route: state.route,
		toasterData: state.toasterData,
		preview: state.preview,
		cart: state.cart,
		metadata: state.metadata,
		lookup: state.lookup,
		extendedDobjInfo: state.extendedDobjInfo,
		tsSettings: state.tsSettings,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		failWithError: (error: Error) => failWithError(dispatch as PortalDispatch)(error),
		updateRoute: (hash: string) => dispatch(updateRoute(hash)),
		updateCheckedObjectsInCart: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInCart(ids)),
		setPreviewUrl: (url: UrlStr) => dispatch(setPreviewUrl(url)),
		storeTsPreviewSetting: (spec: string, type: string, val: string) => dispatch(storeTsPreviewSetting(spec, type, val)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

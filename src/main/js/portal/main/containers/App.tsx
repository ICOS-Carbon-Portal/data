import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart';
import Preview from '../components/preview/Preview';
import Metadata, { MetadataTitle } from './Metadata';
import ErrorBoundary from '../components/ErrorBoundary';
import {updateCheckedObjectsInCart} from '../actions/cart';
import {storeTsPreviewSetting} from '../actions/preview';
import config from '../config';
import {MetaDataObject, Route, State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import Cart from "../models/Cart";
import {
	addToCart, failWithError,
	removeFromCart,
	setMetadataItem,
	setPreviewUrl,
	switchToPreview,
	updateRoute
} from "../actions/common";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type AppProps = StateProps & DispatchProps;

export class App extends Component<AppProps> {
	constructor(props: AppProps){
		super(props);
	}

	handleRouteClick(newRoute: string){
		this.props.updateCheckedObjectsInCart([]);
		this.props.updateRoute(newRoute as Route);
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

const Title = (props: {route: Route, metadata?: MetaDataObject & {id: UrlStr}}) => {

	switch(props.route) {
		case 'search':
			return (
				<h1 className="col-md-9">
					{config.envri} data portal
					<small> Search, preview, download data objects</small>
				</h1>
			);

		case 'metadata':
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
	route: Route
}

const SwitchRouteBtn = (props: ButtonProps) => {
	switch(props.route){

		case 'search':
			return <SearchBtn {...props} />;

		case 'cart':
			return null;

		default:
			return <SearchBtn {...props} />;
	}
};

const SearchBtn = (props: ButtonProps) => {
	const {cart, handleRouteClick} = props;
	const colCount = cart.count;

	return (
		<button className="btn btn-primary" onClick={() => handleRouteClick('cart')}>
			View data cart
			<span style={{marginLeft: 5}} className="badge">
				{colCount} {colCount === 1 ? ' item' : ' items'}
			</span>
		</button>
	);
};

const Route = (props: AppProps) => {
	switch(props.route){
		case 'search':
			return <Search />;

		case 'cart':
			return <DataCart />;

		case 'preview':
			return (
				<Preview
					preview={props.preview}
					cart={props.cart}
					extendedDobjInfo={props.extendedDobjInfo}
					tsSettings={props.tsSettings}
					setPreviewUrl={props.setPreviewUrl}
					storeTsPreviewSetting={props.storeTsPreviewSetting}
					addToCart={props.addToCart}
					removeFromCart={props.removeFromCart}
					setMetadataItem={props.setMetadataItem}
				/>);

		case 'metadata':
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
		updateRoute: (route: Route) => dispatch(updateRoute(route)),
		updateCheckedObjectsInCart: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInCart(ids)),
		setPreviewUrl: (url: UrlStr) => dispatch(setPreviewUrl(url)),
		setPreview: (url: UrlStr | UrlStr[], newRoute: Route) => dispatch(switchToPreview(url, newRoute)),
		storeTsPreviewSetting: (spec: string, type: string, val: string) => dispatch(storeTsPreviewSetting(spec, type, val)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

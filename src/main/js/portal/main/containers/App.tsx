import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './search/Search.jsx';
import DataCart from './DataCart';
import Preview from './Preview';
import Metadata, { MetadataTitle } from './Metadata';
import ErrorBoundary from '../components/ErrorBoundary';
import {updateCheckedObjectsInCart} from '../actions/cart';
import config from '../config';
import {Route, State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import Cart from "../models/Cart";
import {failWithError, updateRoute} from "../actions/common";


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
					<Route route={props.route} />
				</ErrorBoundary>
			</div>
		);
	}
}

const Title = (props: {route: Route, metadata?: State['metadata']}) => {

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
	if (props.route === 'cart'){
		return null;

	} else {
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

const Route = ({route}: {route: Route}) => {
	switch(route){
		case 'search':
			return <Search />;

		case 'cart':
			return <DataCart />;

		case 'preview':
			return (
				<Preview />);

		case 'metadata':
			return <Metadata />;
	}
};

function stateToProps(state: State){
	return {
		route: state.route,
		toasterData: state.toasterData,
		cart: state.cart,
		metadata: state.metadata,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		failWithError: (error: Error) => failWithError(dispatch as PortalDispatch)(error),
		updateRoute: (route: Route) => dispatch(updateRoute(route)),
		updateCheckedObjectsInCart: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInCart(ids)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

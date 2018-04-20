import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import {updateRoute, switchTab, setPreviewVisibility, setFilterTemporal} from '../actions';
import commonConfig from '../../../common/main/config';
import localConfig from '../config';

export class App extends Component {
	constructor(props){
		super(props);
	}

	handleRouteClick(){
		const {cart, preview, routeAndParams} = this.props;
		const newRoute = routeAndParams.route === localConfig.ROUTE_SEARCH
			? localConfig.ROUTE_CART
			: localConfig.ROUTE_SEARCH;

		this.props.setPreviewVisibility(newRoute === localConfig.ROUTE_CART && preview.item && cart.hasItem(preview.item.id));
		this.props.updateRoute(newRoute);
	}

	render(){
		const props = this.props;

		return (
			<div className="container-fluid" style={{marginTop: 10}}>

				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div className="page-header">
					<h1>
						{commonConfig.envri} data portal
						<small> Search, preview, download data objects</small>

						<SwitchRouteBtn
							currentRoute={props.routeAndParams.route}
							cart={props.cart}
							action={this.handleRouteClick.bind(this)}
						/>
					</h1>
				</div>

				<ErrorBoundary>
					<Route {...props} />
				</ErrorBoundary>
			</div>
		);
	}
}

const SwitchRouteBtn = props => {
	switch(props.currentRoute){

		case localConfig.ROUTE_SEARCH:
			return <SearchBtn {...props} />;

		case localConfig.ROUTE_CART:
			return <CartBtn {...props} />;

		default:
			return <SearchBtn {...props} />;
	}
};

const SearchBtn = props => {
	const {cart, action} = props;
	const colCount = cart.count;

	return (
		<button className="btn btn-primary" onClick={action} style={{float: 'right'}}>
			View data cart
			<span style={{marginLeft: 5}} className="badge">
				{colCount} {colCount === 1 ? ' item' : ' items'}
			</span>
		</button>
	);
};

const CartBtn = props => {
	const {action} = props;

	return (
		<button className="btn btn-primary" onClick={action} style={{float: 'right'}}>
			Switch to search
		</button>
	);
};

const Route = props => {
	switch(props.routeAndParams.route){

		case localConfig.ROUTE_SEARCH:
			return <Search {...props} />;

		case localConfig.ROUTE_CART:
			return <DataCart {...props} />;

		default:
			return <Search {...props}  />;
	}
};

function stateToProps(state){
	return {
		lookup: state.lookup,
		user: state.user,
		routeAndParams: state.routeAndParams,
		toasterData: state.toasterData,
		cart: state.cart,
		preview: state.preview
	};
}

function dispatchToProps(dispatch){
	return {
		updateRoute: hash => dispatch(updateRoute(hash)),
		switchTab: (tabName, selectedTabId) => dispatch(switchTab(tabName, selectedTabId)),
		setPreviewVisibility: visibility => dispatch(setPreviewVisibility(visibility)),
		setFilterTemporal: filterTemporal => dispatch(setFilterTemporal(filterTemporal)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

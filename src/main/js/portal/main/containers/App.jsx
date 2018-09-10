import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart.jsx';
import Preview from '../components/preview/Preview.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import {setPreviewUrl, updateRoute, switchTab, setFilterTemporal} from '../actions';
import commonConfig from '../../../common/main/config';
import localConfig from '../config';

export class App extends Component {
	constructor(props){
		super(props);
	}

	handleRouteClick(newRoute){
		this.props.updateRoute(newRoute);
	}

	handleBackButton(previousRoute){
		this.props.updateRoute(previousRoute);
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
					<h1 className="col-md-9">
						{commonConfig.envri} data portal
						<small> Search, preview, download data objects</small>
					</h1>
					<div className="col-md-3 text-right" style={{marginTop: 30}}>
						<SwitchRouteBtn
							currentRoute={props.routeAndParams.route}
							cart={props.cart}
							action={this.handleRouteClick.bind(this)}
						/>
					</div>
				</div>

				<ErrorBoundary>
					<Route
						backButtonAction={this.handleBackButton.bind(this)}
						routeAction={this.handleRouteClick.bind(this)}
						{...props} />
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
			return null;

		default:
			return <SearchBtn {...props} />;
	}
};

const SearchBtn = props => {
	const {cart, action} = props;
	const colCount = cart.count;

	return (
		<button className="btn btn-primary" onClick={action.bind(this, localConfig.ROUTE_CART)}>
			View data cart
			<span style={{marginLeft: 5}} className="badge">
				{colCount} {colCount === 1 ? ' item' : ' items'}
			</span>
		</button>
	);
};

const Route = props => {
	switch(props.routeAndParams.route){
		case localConfig.ROUTE_SEARCH:
			return <Search {...props} />;

		case localConfig.ROUTE_CART:
			return <DataCart {...props} />;

		case localConfig.ROUTE_PREVIEW:
			return <Preview {...props} />;

		default:
			return <Search {...props} />;
	}
};

function stateToProps(state){
	return {
		lookup: state.lookup,
		user: state.user,
		routeAndParams: state.routeAndParams,
		toasterData: state.toasterData,
		cart: state.cart,
		preview: state.preview,
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		checkedObjectsInCart: state.checkedObjectsInCart,
		extendedDobjInfo: state.extendedDobjInfo,
	};
}

function dispatchToProps(dispatch){
	return {
		updateRoute: hash => dispatch(updateRoute(hash)),
		switchTab: (tabName, selectedTabId) => dispatch(switchTab(tabName, selectedTabId)),
		setFilterTemporal: filterTemporal => dispatch(setFilterTemporal(filterTemporal)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

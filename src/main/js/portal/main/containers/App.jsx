import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart.jsx';
import Preview from '../components/preview/Preview.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import {failWithError, setPreviewUrl, updateRoute, switchTab, setFilterTemporal, updateCheckedObjectsInCart,
	updateCheckedObjectsInSearch, storeTsPreviewSetting, getResourceHelpInfo} from '../actions';
import {addToCart, removeFromCart} from '../actions';
import config from '../config';


export class App extends Component {
	constructor(props){
		super(props);
	}

	handleRouteClick(newRoute){
		this.props.updateCheckedObjectsInCart([]);
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
						{config.envri} data portal
						<small> Search, preview, download data objects</small>
					</h1>
					<div className="col-md-3 text-right" style={{marginTop: 30}}>
						<SwitchRouteBtn
							currentRoute={props.route}
							cart={props.cart}
							action={this.handleRouteClick.bind(this)}
						/>
					</div>
				</div>

				<ErrorBoundary failWithError={props.failWithError}>
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

		case config.ROUTE_SEARCH:
			return <SearchBtn {...props} />;

		case config.ROUTE_CART:
			return null;

		default:
			return <SearchBtn {...props} />;
	}
};

const SearchBtn = props => {
	const {cart, action} = props;
	const colCount = cart.count;

	return (
		<button className="btn btn-primary" onClick={action.bind(this, config.ROUTE_CART)}>
			View data cart
			<span style={{marginLeft: 5}} className="badge">
				{colCount} {colCount === 1 ? ' item' : ' items'}
			</span>
		</button>
	);
};

const Route = props => {
	switch(props.route){
		case config.ROUTE_SEARCH:
			return <Search {...props} />;

		case config.ROUTE_CART:
			return <DataCart {...props} />;

		case config.ROUTE_PREVIEW:
			return <Preview {...props} />;

		default:
			return <Search {...props} />;
	}
};

function stateToProps(state){
	return {
		lookup: state.lookup,
		user: state.user,
		toasterData: state.toasterData,
		cart: state.cart,
		preview: state.preview,
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		checkedObjectsInCart: state.checkedObjectsInCart,
		extendedDobjInfo: state.extendedDobjInfo,
		route: state.route,
		filterCategories: state.filterCategories,
		tabs: state.tabs,
		page: state.page,
		tsSettings: state.tsSettings,
		helpStorage: state.helpStorage
	};
}

function dispatchToProps(dispatch){
	return {
		failWithError: error => failWithError(dispatch)(error),
		updateRoute: hash => dispatch(updateRoute(hash)),
		switchTab: (tabName, selectedTabId) => dispatch(switchTab(tabName, selectedTabId)),
		setFilterTemporal: filterTemporal => dispatch(setFilterTemporal(filterTemporal)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		updateCheckedObjectsInCart: ids => dispatch(updateCheckedObjectsInCart(ids)),
		updateCheckedObjectsInSearch: ids => dispatch(updateCheckedObjectsInSearch(ids)),
		addToCart: objInfo => dispatch(addToCart(objInfo)),
		removeFromCart: id => dispatch(removeFromCart(id)),
		storeTsPreviewSetting: (spec, type, val) => dispatch(storeTsPreviewSetting(spec, type, val)),
		getResourceHelpInfo: (helpItem, uriList) => dispatch(getResourceHelpInfo(helpItem, uriList)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

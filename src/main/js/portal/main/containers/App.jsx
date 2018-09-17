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
		// console.log({previousRoute});
		this.props.updateRoute(previousRoute);
	}

	render(){
		const props = this.props;
		// console.log({route: props.route});

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
							currentRoute={props.route}
							cart={props.cart}
							action={this.handleRouteClick.bind(this)}
						/>
					</h1>
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
		<button className="btn btn-primary" onClick={action.bind(this, localConfig.ROUTE_CART)} style={{float: 'right'}}>
			View data cart
			<span style={{marginLeft: 5}} className="badge">
				{colCount} {colCount === 1 ? ' item' : ' items'}
			</span>
		</button>
	);
};

const Route = props => {
	switch(props.route){
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

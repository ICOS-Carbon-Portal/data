import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart.jsx';
import Preview from '../components/preview/Preview.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import {setPreviewUrl, updateRoute, switchTab, setFilterTemporal, setPreviewItem, updateCheckedObjects} from '../actions';
import commonConfig from '../../../common/main/config';
import localConfig from '../config';

export class App extends Component {
	constructor(props){
		super(props);
		this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
	}

	handleRouteClick(newRoute){
		this.props.updateRoute(newRoute);
	}

	hidePreview() {
		this.props.updateRoute(localConfig.ROUTE_SEARCH);
	}

	handleCheckboxChange(event) {
		var checkedObjects = Array.from(document.querySelectorAll('.data-checkbox:checked'))
			.map((checkbox) => checkbox.value);

		this.props.updateCheckedObjects(checkedObjects)
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
					<Route
						handleCheckboxChange={this.handleCheckboxChange.bind(this)}
						checkedObjects={props.checkedObjects}
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
			return <CartBtn {...props} />;

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

const CartBtn = props => {
	const {action} = props;

	return (
		<button className="btn btn-primary" onClick={action.bind(this, localConfig.ROUTE_SEARCH)} style={{float: 'right'}}>
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
		checkedObjects: state.checkedObjects
	};
}

function dispatchToProps(dispatch){
	return {
		updateRoute: hash => dispatch(updateRoute(hash)),
		switchTab: (tabName, selectedTabId) => dispatch(switchTab(tabName, selectedTabId)),
		setFilterTemporal: filterTemporal => dispatch(setFilterTemporal(filterTemporal)),
		setPreviewUrl: url => dispatch(setPreviewUrl(url)),
		updateCheckedObjects: obj => dispatch(updateCheckedObjects(obj)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

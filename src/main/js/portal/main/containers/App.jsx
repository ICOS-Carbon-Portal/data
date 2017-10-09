import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart.jsx';
import {updateRoute, setPreviewVisibility, logOut} from '../actions';
import config from '../config';

export class App extends Component {
	constructor(props){
		super(props);
	}

	handleRouteClick(){
		const {cart, preview} = this.props;
		const currentRoute = this.props.route;
		const newRoute = !currentRoute || currentRoute === config.ROUTE_SEARCH
			? config.ROUTE_CART
			: config.ROUTE_SEARCH;

		this.props.setPreviewVisibility(newRoute === config.ROUTE_CART && preview.item && cart.hasItem(preview.item.id));
		this.props.updateRoute(newRoute);
	}

	render(){
		const props = this.props;
		// console.log({AppProps: props});

		return (
			<div className="container-fluid" style={{marginTop: 10}}>
				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div className="page-header">
					<h1>
						ICOS data portal
						<small> Under construction</small>

						<SwitchRouteBtn
							currentRoute={props.route}
							cart={props.cart}
							action={this.handleRouteClick.bind(this)}
						/>
					</h1>
				</div>

				<Route {...props} />
			</div>
		);
	}
}

const SwitchRouteBtn = props => {
	switch(props.currentRoute){

		case config.ROUTE_SEARCH:
			return <RouteSearchBtn {...props} />;

		case config.ROUTE_CART:
			return <RouteCartBtn {...props} />;

		default:
			return <RouteSearchBtn {...props} />;
	}
};

const RouteSearchBtn = props => {
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

const RouteCartBtn = props => {
	const {action} = props;

	return (
		<button className="btn btn-primary" onClick={action} style={{float: 'right'}}>
			Switch to search
		</button>
	);
};

const Route = props => {
	switch(props.route){

		case config.ROUTE_SEARCH:
			return <Search {...props} />;

		case config.ROUTE_CART:
			return <DataCart {...props} />;

		default:
			return <Search {...props}  />;
	}
};

function stateToProps(state){
	return {
		lookup: state.lookup,
		user: state.user,
		route: state.route,
		toasterData: state.toasterData,
		cart: state.cart,
		preview: state.preview
	};
}

function dispatchToProps(dispatch){
	return {
		updateRoute: route => dispatch(updateRoute(route)),
		setPreviewVisibility: visibility => dispatch(setPreviewVisibility(visibility)),
		logOut: () => dispatch(logOut)
	};
}

export default connect(stateToProps, dispatchToProps)(App);

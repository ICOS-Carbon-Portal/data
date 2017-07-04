import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import DataCart from './DataCart.jsx';
import {changeRoute, setPreviewVisibility} from '../actions';

const ROUTE_SEARCH = 'ROUTE_SEARCH';
const ROUTE_CART = 'ROUTE_CART';

export class App extends Component {
	constructor(props){
		super(props);
	}

	handleRouteClick(){
		const currentRoute = this.props.route;
		const newRoute = !currentRoute || currentRoute === ROUTE_SEARCH
			? ROUTE_CART
			: ROUTE_SEARCH;

		this.props.setPreviewVisibility(false);
		this.props.changeRoute(newRoute);
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

		case ROUTE_SEARCH:
			return <RouteSearchBtn {...props} />;

		case ROUTE_CART:
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
			Switch to data cart
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

		case ROUTE_SEARCH:
			return <Search {...props} />;

		case ROUTE_CART:
			return <DataCart {...props} />;

		default:
			return <Search {...props}  />;
	}
};

function stateToProps(state){
	return {
		route: state.route,
		toasterData: state.toasterData,
		cart: state.cart
	};
}

function dispatchToProps(dispatch){
	return {
		changeRoute: route => dispatch(changeRoute(route)),
		setPreviewVisibility: visibility => dispatch(setPreviewVisibility(visibility)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

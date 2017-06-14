import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import Collections from './Collections.jsx';
import {changeRoute} from '../actions';

const ROUTE_SEARCH = 'ROUTE_SEARCH';
const ROUTE_COLLECTION = 'ROUTE_COLLECTION';

export class App extends Component {
	constructor(props){
		super(props);
	}

	handleRouteClick(){
		const currentRoute = this.props.route;
		const newRoute = !currentRoute || currentRoute === ROUTE_SEARCH
			? ROUTE_COLLECTION
			: ROUTE_SEARCH;

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
							collection={props.collection}
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
	const {currentRoute, collection, action} = props;
	const colCount = collection.count;

	switch(currentRoute){

		case ROUTE_SEARCH:
			return <RouteSearchBtn {...props} />;

		case ROUTE_COLLECTION:
			return <RouteCollectionBtn {...props} />;

		default:
			return <RouteSearchBtn {...props} />;
	}
};

const RouteSearchBtn = props => {
	const {collection, action} = props;
	const colCount = collection.count;

	return (
		<button className="btn btn-primary" onClick={action} style={{float: 'right'}}>
			Switch to collection
			<span style={{marginLeft: 5}} className="badge">
						{colCount} {colCount === 1 ? ' item' : ' items'}
					</span>
		</button>
	);
};

const RouteCollectionBtn = props => {
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

		case ROUTE_COLLECTION:
			return <Collections {...props} />;

		default:
			return <Search {...props}  />;
	}
};

function stateToProps(state){
	return {
		route: state.route,
		toasterData: state.toasterData,
		collection: state.collection
	};
}

function dispatchToProps(dispatch){
	return {
		changeRoute: route => dispatch(changeRoute(route))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

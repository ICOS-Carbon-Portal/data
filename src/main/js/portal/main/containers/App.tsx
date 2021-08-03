import React, { Component, ReactNode, MouseEvent } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './search/Search';
import DataCart from './DataCart';
import Preview from './Preview';
import Metadata, { MetadataTitle } from './Metadata';
import ErrorBoundary from '../components/ErrorBoundary';
import {updateCheckedObjectsInCart} from '../actions/cart';
import config, {breadcrumbs, Breadcrumb} from '../config';
import {Route, State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
import Cart from "../models/Cart";
import {failWithError, updateRoute} from "../actions/common";
import HelpSection from '../components/help/HelpSection';
import { UiInactivateAllHelp } from '../reducers/actionpayloads';


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

					<Breadcrumbs handleRouteClick={this.handleRouteClick.bind(this)} route={props.route}/>

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
					<Route route={props.route}>
						<div style={{ position: 'absolute', top: -20, right: 15, bottom: 0 }}>
							<div style={{ position: 'sticky', top: 2, padding: 0, zIndex: 9999 }}>
								<HelpSection width={300} onHelpClose={this.props.onHelpClose} helpStorage={this.props.helpStorage} />
							</div>
						</div>
					</Route>
				</ErrorBoundary>
			</div>
		);
	}
}

const Breadcrumbs = (props: { handleRouteClick: (newRoute: string) => void, route: Route}) => {
	return (
		<nav role="navigation" aria-label="breadcrumb">
			<ol className="breadcrumb">
				{breadcrumbs[config.envri].map(b => BreadcrumbItem(b, props.handleRouteClick, props.route))}
			</ol>
		</nav>
	)
}

const BreadcrumbItem = (item: Breadcrumb, handleRouteClick: (newRoute: string) => void, route: Route) => {
	const onclick: (event: MouseEvent<HTMLAnchorElement>) => void =
		(item.url == "/portal") ? (e: MouseEvent) => {
			e.preventDefault()
			handleRouteClick('search')
		} : _ => _;

	return ((item.url == "/portal" && route == 'search') ?
		<li key={item.label} className="breadcrumb-item active">{item.label}</li> :
		<li key={item.label} className="breadcrumb-item"><a onClick={e => onclick(e)} href={item.url}>{item.label}</a></li>)
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

const Route = ({ route, children }: { route: Route, children: ReactNode }) => {
	switch(route){
		case 'search':
			return (
				<Search HelpSection={children} />
			);

		case 'cart':
			return <DataCart />;

		case 'preview':
			return (
				<Preview HelpSection={children} />
			);

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
		helpStorage: state.helpStorage,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		failWithError: (error: Error) => failWithError(dispatch as PortalDispatch)(error),
		updateRoute: (route: Route) => dispatch(updateRoute(route)),
		updateCheckedObjectsInCart: (ids: UrlStr[]) => dispatch(updateCheckedObjectsInCart(ids)),
		onHelpClose: () => dispatch(new UiInactivateAllHelp())
	};
}

export default connect(stateToProps, dispatchToProps)(App);

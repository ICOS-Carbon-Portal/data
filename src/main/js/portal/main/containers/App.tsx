import React, { Component, ReactNode, MouseEvent } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './search/Search';
import DataCart from './DataCart';
import Preview from './Preview';
import ErrorBoundary from '../components/ErrorBoundary';
import {updateCheckedObjectsInCart} from '../actions/cart';
import config, {breadcrumbs, Breadcrumb} from '../config';
import {Route, State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import {PortalDispatch} from "../store";
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

		if (!props.route) {
			return null;
		}

		return (
			<div>

				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div className="row page-header mb-3">

					<Breadcrumbs handleRouteClick={this.handleRouteClick.bind(this)} route={props.route}/>

					<Title route={props.route} metadata={props.metadata} />

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
			<ol className="breadcrumb bg-light p-2">
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
					{config.envri === "ICOS" &&
						<span className="fs-3 text-secondary"> Search, preview, download data objects</span>
					}
				</h1>
			);

		default:
			return <div className="col-md-9" />;
	}
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
			return <React.Fragment />;
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

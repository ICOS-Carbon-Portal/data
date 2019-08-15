import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Panel from '../components/Panel.jsx';
import {switchTimePeriod} from '../actions';


export class App extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {toasterData, failWithError} = this.props;

		return (
			<div style={{marginTop: 10}}>

				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={toasterData}
					maxWidth={400}
				/>

				<ErrorBoundary failWithError={failWithError}>
					<AppRoute {...this.props} />
				</ErrorBoundary>
			</div>
		);
	}
}

const AppRoute = props => {
	const {displayError, stats, switchTimePeriod} = props;

	if (displayError) return <DisplayError message={displayError} />;
	if (stats.error) return <DisplayError message={stats.error} />;

	return stats.isValidRequest
		? <div className="container-fluid">
			<Panel stats={stats} switchTimePeriod={switchTimePeriod} />
		</div>
		: <InvalidRequest />;
};

const InvalidRequest = _ => {
	return (
		<div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', position:'absolute', width:'100%', flexDirection:'column'}}>
			<div>
				<h2>Invalid request</h2>

				<div style={{fontWeight:'bold'}}>Required parameters:</div>
				<ul style={{margin:0}}>
					<li>stationId: Station short name.</li>
					<li>valueType: Type of measured gas (co2, ch4, etc).</li>
					<li>height: Sampling height.</li>
				</ul>

				<div style={{marginTop:30}}>
					<a href="https://data.icos-cp.eu/dashboard/?stationId=GAT&valueType=co2&height=60">Example</a>
				</div>
			</div>
		</div>
	);
};

const DisplayError = ({message}) => {
	return (
		<div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', position:'absolute', width:'100%', flexDirection:'column'}}>
			<p>{message}</p>
		</div>
	);
};

function stateToProps(state){
	return state
}

function dispatchToProps(dispatch){
	return {
		switchTimePeriod: timePeriod => dispatch(switchTimePeriod(timePeriod))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

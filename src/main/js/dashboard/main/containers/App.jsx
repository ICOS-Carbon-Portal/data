import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Panel from '../components/Panel.jsx';


export class App extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {stats, toasterData, failWithError} = this.props;

		return (
			<div style={{marginTop: 10}}>

				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={toasterData}
					maxWidth={400}
				/>

				<ErrorBoundary failWithError={failWithError}>
					{stats.isValidRequest
						? <div className="container-fluid">
							<Panels stats={stats} />
						</div>
						: <InvalidRequest />
					}

				</ErrorBoundary>
			</div>
		);
	}
}

const Panels = ({stats}) => {
	return stats.datasets.map((dataset, idx) =>
		<Panel key={'p' + idx} dataset={dataset} metadata={stats.metadata[idx]} params={stats.params} />);
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

function stateToProps(state){
	return state
}

function dispatchToProps(dispatch){
	return {};
}

export default connect(stateToProps, dispatchToProps)(App);

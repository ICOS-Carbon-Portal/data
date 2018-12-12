import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import Filter from '../components/Filter.jsx';
import DobjTable from '../components/DobjTable.jsx';
import { statsUpdate, fetchDownloadStats, requestPage, fetchDownloadStatsPerDateUnit } from '../actions';
import Map from '../components/Map.jsx';
import Graph from '../components/Graph.jsx';


export class App extends Component {
	constructor(props){
		super(props);
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

				<div className="page-header">
					<h1>
						ICOS Data Statistics
					</h1>
				</div>
				<div className="row">
					<div className="col-md-4">
						<Filter
							filters={props.filters}
							updateTableWithFilter={props.updateTableWithFilter}
							downloadStats={props.downloadStats}
							fetchDownloadStats={props.fetchDownloadStats}/>

						<h4>Downloads per country</h4>
						<Map
							countryStats={props.countryStats}
							countriesTopo={props.countriesTopo}
							statsMap={props.statsMap}
						/>

						<h4 style={{marginTop:15}}>Downloads per time period</h4>
						<Graph
							style={{width: '100%', height: 300}}
							statsGraph={props.statsGraph}
							radioAction={props.fetchDownloadStatsPerDateUnit}
						/>
					</div>
					<div className="col-md-8">
						<DobjTable
							downloadStats={props.downloadStats}
							paging={props.paging}
							requestPage={props.requestPage}/>
					</div>
				</div>
			</div>
		);
	}
}

function stateToProps(state) {
	return {
		downloadStats: state.downloadStats,
		statsMap: state.statsMap,
		statsGraph: state.statsGraph,
		countriesTopo: state.countriesTopo,
		paging : state.paging,
		filters: state.filters
	};
}

function dispatchToProps(dispatch) {
	return {
		updateTableWithFilter: (varName, values) => dispatch(statsUpdate(varName, values)),
		fetchDownloadStats: filters => dispatch(fetchDownloadStats(filters)),
		requestPage: page => dispatch(requestPage(page)),
		fetchDownloadStatsPerDateUnit: dateUnit => dispatch(fetchDownloadStatsPerDateUnit(dateUnit))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

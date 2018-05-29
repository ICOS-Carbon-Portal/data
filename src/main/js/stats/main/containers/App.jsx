import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import Filter from '../components/Filter.jsx';
import DobjTable from '../components/DobjTable.jsx';
import { statsUpdate, fetchDownloadStats, requestPage } from '../actions';
import Map from '../components/Map.jsx';


export class App extends Component {
	constructor(props){
		super(props);
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

						<Map>
							<div id="map" />
						</Map>
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
		paging : state.paging,
		filters: state.filters
	};
}

function dispatchToProps(dispatch) {
	return {
		updateTableWithFilter: (varName, values) => dispatch(statsUpdate(varName, values)),
		fetchDownloadStats: filters => dispatch(fetchDownloadStats(filters)),
		requestPage: page => dispatch(requestPage(page))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import Filter from '../components/Filter.jsx';
import DobjTable from '../components/DobjTable.jsx';
import { statsUpdate } from '../actions';

export class App extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		console.log({AppProps: props});

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
					<div className="row">
						<div className="col-md-4">
							<Filter
								filters={props.filters}
								updateTableWithFilter={props.updateTableWithFilter}
								downloadCounts={props.displayedStats}/>
						</div>
						<div className="col-md-8">
							<DobjTable downloadCounts={props.displayedStats}/>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

function stateToProps(state) {
	return {
		downloadCounts: state.downloadCounts,
		displayedStats: state.displayedStats,
		filters: state.filters
	};
}

function dispatchToProps(dispatch) {
	return {
		updateTableWithFilter: (varName, values) => dispatch(statsUpdate(varName, values))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import {
	statsUpdate,
	requestPage,
	fetchDownloadStatsPerDateUnit,
	setViewMode,
	resetFilters,
	temporalFilterUpdate,
	grayDownloadFilterUpdate
} from '../actions';
import Radio from "../components/Radio.jsx";
import {ViewSwitcher} from "../components/ViewSwitcher.jsx";
import config from '../config';


export class App extends Component {
	constructor(props){
		super(props);

		this.viewModes = props.view.modes.map(mode => {
			return {
				txt: mode.charAt(0).toUpperCase() + mode.slice(1),
				isActive: props.view.mode === mode,
				actionTxt: mode
			}
		});
	}

	render(){
		const props = this.props;

		return (
			<div style={{marginTop: 10}}>

				<AnimatedToasters toasterData={props.toasterData} />

				<div className="page-header">
					<h2>
						{config.envri} Data Usage Statistics
						<Radio
							horizontal={true}
							containerStyle={{ display: 'inline', float: 'right' }}
							radios={this.viewModes}
							action={props.setViewMode}
						/>
					</h2>
				</div>

				<ViewSwitcher {...props} />
			</div>
		);
	}
}

function stateToProps(state) {
	return {
		backendSource: state.backendSource,
		downloadStats: state.downloadStats,
		statsMap: state.statsMap,
		statsGraph: state.statsGraph,
		countriesTopo: state.countriesTopo,
		paging : state.paging,
		filters: state.filters,
		view: state.view,
		previewData: state.previewData,
		mainRadio: state.mainRadio,
		subRadio: state.subRadio,
		variousStats: state.variousStats,
		toasterData: state.toasterData
	};
}

function dispatchToProps(dispatch) {
	return {
		updateTableWithFilter: (varName, values) => dispatch(statsUpdate(varName, values)),
		temporalFilterUpdate: (filterTemporal) => dispatch(temporalFilterUpdate(filterTemporal)),
		grayDownloadFilterUpdate: (filterGrayDownload) => dispatch(grayDownloadFilterUpdate(filterGrayDownload)),
		requestPage: page => dispatch(requestPage(page)),
		fetchDownloadStatsPerDateUnit: dateUnit => dispatch(fetchDownloadStatsPerDateUnit(dateUnit)),
		setViewMode: mode => dispatch(setViewMode(mode)),
		resetFilters: () => dispatch(resetFilters()),
	};
}

export default connect(stateToProps, dispatchToProps)(App);

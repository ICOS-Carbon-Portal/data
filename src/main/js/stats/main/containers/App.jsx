import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import { statsUpdate, fetchDownloadStats, requestPage, fetchDownloadStatsPerDateUnit, setViewMode } from '../actions';
import Radio from "../components/Radio.jsx";
import {ViewSwitcher} from "../components/ViewSwitcher.jsx";
import config from '../config';


export class App extends Component {
	constructor(props){
		super(props);

		this.radios = props.view.modes.map(mode => {
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
				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div className="page-header">
					<h1>
						{config.envri} Data Statistics
						<Radio
							horizontal={true}
							containerStyle={{display:'inline', float:'right'}}
							radios={this.radios}
							action={props.setViewMode}
						/>
					</h1>
				</div>

				<ViewSwitcher {...props} />
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
		filters: state.filters,
		view: state.view,
		previewData: state.previewData,
		radiosPreviewMain: state.mainRadio,
		radiosPreviewSub: state.subRadio,
	};
}

function dispatchToProps(dispatch) {
	return {
		updateTableWithFilter: (varName, values) => dispatch(statsUpdate(varName, values)),
		fetchDownloadStats: filters => dispatch(fetchDownloadStats(filters)),
		requestPage: page => dispatch(requestPage(page)),
		fetchDownloadStatsPerDateUnit: dateUnit => dispatch(fetchDownloadStatsPerDateUnit(dateUnit)),
		setViewMode: mode => dispatch(setViewMode(mode))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

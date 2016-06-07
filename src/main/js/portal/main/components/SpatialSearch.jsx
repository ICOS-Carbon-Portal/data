import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import MapSearch from './MapSearch.jsx';
import config from '../config';

class SpatialSearch extends Component {
	constructor(props) {
		super(props);
		this.state = {
			clustered: false,
			resetExtent: 0,
			showAll: 0,
			zoomTo: 0
		}
	}

	onClusterClick(cluster){
		this.setState({clustered: cluster});
	}

	onResetClick(){
		this.setState({resetExtent: this.state.resetExtent + 1});
	}

	onShowAllStationsClick(){
		this.setState({showAll: this.state.showAll + 1});
	}

	onZoomToStationsClick(){
		this.setState({zoomTo: this.state.zoomTo + 1});
	}

	render(){
		const props = this.props;
		const resetBtnCss = props.filters[config.spatialStationProp].isEmpty()
			? 'btn btn-default'
			: 'btn btn-primary';
		const resetBtnDisabled = props.filters[config.spatialStationProp].isEmpty();

		return (
			<div>
				<div className="col-md-5">
					<MapSearch
						clustered={this.state.clustered}
						resetExtent={this.state.resetExtent}
						showAll={this.state.showAll}
						zoomTo={this.state.zoomTo}
					/>
				</div>
				<div className="col-md-2">
					<div className="btn-group" role="group">
						<button ref="clusterBtn" type="button"
								className={getBtnClass(this.state.clustered)}
								onClick={() => this.onClusterClick(true)}>Clustered</button>

						<button ref="unclusterBtn" type="button"
								className={getBtnClass(!this.state.clustered)}
								onClick={() => this.onClusterClick(false)}>Not clustered</button>
					</div>

					<div style={{display: 'block', marginBottom: 10}}>
						<button className={resetBtnCss}
								disabled={resetBtnDisabled}
								style={{display: 'block', marginTop: 10}}
								onClick={() => this.onResetClick()}>
							Reset
						</button>
					</div>

					<div style={{display: 'block', marginBottom: 10}}>
						<button type="button" className="btn btn-default" onClick={() => this.onShowAllStationsClick()}>
							<span className="glyphicon glyphicon-globe" style={{marginRight: 5}} aria-hidden="true"></span>
							Show all stations
						</button>
					</div>

					<div style={{display: 'block', marginBottom: 10}}>
						<button type="button" className="btn btn-default" onClick={() => this.onZoomToStationsClick()}>
							<span className="glyphicon glyphicon-resize-small" style={{marginRight: 5}} aria-hidden="true"></span>
							Zoom to selected stations
						</button>
					</div>
				</div>
			</div>
		);
	}
}

function getBtnClass(active){
	return active
		? "btn btn-default active"
		: "btn btn-default";
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {};
}

export default connect(stateToProps, dispatchToProps)(SpatialSearch);
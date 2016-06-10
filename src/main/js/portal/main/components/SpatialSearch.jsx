import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import MapSearch from './MapSearch.jsx';
import config from '../config';

class SpatialSearch extends Component {
	constructor(props) {
		super(props);
		this.state = {
			clustered: false
		}
	}

	componentWillReceiveProps(){
		const mapDiv = ReactDOM.findDOMNode(this.refs.mapDiv);
		const mapDivHeight = mapDiv.getBoundingClientRect().height;

		this.setState({mapDivHeight});
	}

	onClusterClick(cluster){
		this.setState({clustered: cluster});
	}

	render(){
		const props = this.props;
		const resetBtnCss = props.filters[config.spatialStationProp].isEmpty()
			? 'btn btn-default'
			: 'btn btn-primary';
		const resetBtnDisabled = props.filters[config.spatialStationProp].isEmpty();
		const selStationCount = props.spatial.forMap.filter(st => st.lat && st.lon).length;
		const totStationCount = props.spatial.stations.length - props.spatial.woSpatialExtent.length;
		const mapDivHeight = this.state.mapDivHeight || 320;

		return (
			<div>
				<div ref="mapDiv" className="col-md-5">
					<MapSearch
						ref="mapSearch"
						filterUpdate={props.filterUpdate}
						spatial={props.spatial}
						clustered={this.state.clustered}
					/>
				</div>
				<div className="col-md-2" style={{height:mapDivHeight}}>
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
								onClick={() => this.refs.mapSearch.resetExtent()}>
							Reset
						</button>
					</div>

					<div style={{display: 'block', marginBottom: 10}}>
						<button type="button" className="btn btn-default" onClick={() => this.refs.mapSearch.zoomTo(true)}>
							<span className="glyphicon glyphicon-globe" style={{marginRight: 5}} aria-hidden="true"></span>
							Zoom to full extent
						</button>
					</div>

					<div style={{display: 'block', marginBottom: 10}}>
						<button type="button" className="btn btn-default" onClick={() => this.refs.mapSearch.zoomTo(false)}>
							<span className="glyphicon glyphicon-resize-small" style={{marginRight: 5}} aria-hidden="true"></span>
							Zoom to selected stations
						</button>
					</div>

					<div style={{position: 'absolute', bottom: 0, right: 0}}>
						<label>Selected stations in map:&nbsp;</label>
						<span>{selStationCount} out of {totStationCount}</span>
						<label>Stations without geographic position:&nbsp;</label>
						<span>{props.spatial.woSpatialExtent.length}</span>
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

export default SpatialSearch;
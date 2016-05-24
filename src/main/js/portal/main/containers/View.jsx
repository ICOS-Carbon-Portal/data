import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Dygraphs from '../components/Dygraphs.jsx';
import Leaflet from '../components/Leaflet.jsx';
import DataObjectList from '../components/DataObjectList.jsx';
import MetaDataTable from '../components/MetaDataTable.jsx';

class View extends Component {
	constructor(props){
		super(props);
		this.state = {loadComponents: false};
	}

	componentDidMount(){
		if(this.state.loadComponents) return;

		const chartDiv = ReactDOM.findDOMNode(this.refs.chartDiv);
		const chartDivWidth = chartDiv.getBoundingClientRect().width - 44;

		const mapDiv = ReactDOM.findDOMNode(this.refs.mapDiv);
		const mapDivWidth = mapDiv.getBoundingClientRect().width;

		this.setState({mapDivWidth, chartDivWidth, loadComponents: true});
	}

	render() {
		const props = this.props;
		const status = this.props.status;
		// console.log({viewRender: props});

		return (
			<div id="cp_data_search" className="container-fluid">
				<h1>ICOS Data Service search result</h1>

				{props.filteredDataObjects && props.filteredDataObjects.length
					? (
						<div className="row">
							<div className="col-md-3">
								<label>Number of returned data objects:</label> <span>{props.dataObjects.length}</span>
							</div>
						</div>
					)
					: null
					}

				<div className="row">
					<div className="col-md-3" style={{maxHeight: 430, overflow: 'auto'}}>
						<DataObjectList dataObjects={props.dataObjects}/>
					</div>
					<div ref="chartDiv" id="chartDiv" className="col-md-6">
						{props.forChart.data.length > 0 && this.state.loadComponents
						? <Dygraphs {...props.forChart} width={this.state.chartDivWidth} /> //<Chart ref="chartComp" {...props.forChart} width={this.state.chartDivWidth} />
							: null
						}
					</div>
					<div ref="mapDiv" id="mapDiv" className="col-md-3">
						{props.forMap.geoms.length > 0 && this.state.loadComponents
							? <Leaflet
								geoms={props.forMap.geoms}
								labels={props.forChart.labels.slice(1)}
								metaData={props.dataObjects.filter(dob => dob.view)}
								width={this.state.mapDivWidth}
							/>
							: null
						}
					</div>

				</div>
				<div className="row">

				</div>
				<div className="row">
					<div ref="metaDiv" id="metaDiv" className="col-md-12">
						<MetaDataTable dataObjects={props.dataObjects} forChart={props.forChart} />
					</div>
				</div>
			</div>
		);
	}
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {};
}

export default connect(stateToProps, dispatchToProps)(View);


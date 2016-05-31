import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import MapSearch from './MapSearch.jsx';

class SpatialSearch extends Component {
	constructor(props) {
		super(props);
		this.state = {
			clustered: false,
			resetExtent: 0
		}
	}

	onClusterClick(cluster){
		this.setState({clustered: cluster});
	}

	onResetClick(){
		const curr = this.state.resetExtent + 1;
		this.setState({resetExtent: curr});
	}

	render(){
		const props = this.props;
		const disabled = false;

		return (
			<div>
				<div className="col-md-5">
					<MapSearch clustered={this.state.clustered} resetExtent={this.state.resetExtent} />
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
					<button className="btn btn-default"
							disabled={disabled}
							style={{display: 'block', marginTop: 10}}
							onClick={() => this.onResetClick()}>Reset</button>
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
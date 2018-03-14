import React, { Component } from 'react';
import Slider from '../ui/Slider.jsx';
import PickDates from './PickDates.jsx';
import FilterByPid from './FilterByPid.jsx';


export default class Filters extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;

		return (
			<div style={{marginTop: 15}}>
				<div className="panel panel-default">
					<div className="panel-heading">
						<h3 className="panel-title">Temporal filters</h3>
					</div>

					<Slider startCollapsed={false}>
						<div className="panel-body" style={{paddingTop:0}}>
							<PickDates
								filterTemporal={props.filterTemporal}
								setFilterTemporal={props.setFilterTemporal}
								category="dataTime"
								header="Data sampled"
							/>
							<PickDates
								marginTop={25}
								filterTemporal={props.filterTemporal}
								setFilterTemporal={props.setFilterTemporal}
								category="submission"
								header="Submission of data"
							/>
						</div>
					</Slider>
				</div>

				<div className="panel panel-default">
					<div className="panel-heading">
						<h3 className="panel-title">Free text filters</h3>
					</div>

					<Slider startCollapsed={false}>
						<div className="panel-body" style={{paddingTop:0}}>
							<FilterByPid
								queryMeta={props.queryMeta}
								pidList={props.filterFreeText.pidList}
								selectedPids={props.filterFreeText.selectedPids}
								updateSelectedPids={props.updateSelectedPids}
							/>
						</div>
					</Slider>
				</div>
			</div>
		);
	}
}

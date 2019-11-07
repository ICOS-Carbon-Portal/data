import React, { Component } from 'react';
import Slider from '../ui/Slider.jsx';
import FilterByPid from './FilterByPid.jsx';


export default class Filters extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {queryMeta, filterFreeText, updateSelectedPids} = this.props;

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">Free text filters</h3>
				</div>

				<Slider startCollapsed={false}>
					<div className="panel-body" style={{paddingTop:0}}>
						<FilterByPid
							queryMeta={queryMeta}
							pidList={filterFreeText.pidList}
							selectedPids={filterFreeText.selectedPids}
							updateSelectedPids={updateSelectedPids}
						/>
					</div>
				</Slider>
			</div>
		);
	}
}

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Dygraph from 'dygraphs';

export default class Dygraphs extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount(){
		const props = this.props;

		this.graph = new Dygraph(ReactDOM.findDOMNode(this.refs.graphDiv),
			props.data.getData(),
			{
				drawCallback: this.rangeChangeHandler.bind(this),
				dateWindow: props.dateRange,
				strokeWidth: 1,
				width: props.width,
				labels: props.data.labels,
				legend: 'always',
				labelsDiv: ReactDOM.findDOMNode(this.refs.labelsDiv),
				labelsSeparateLines: false,
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						valueFormatter: function(ms){
							//Firefox hack: add empty bold string
							return '<b></b>' + new Date(ms).toUTCString();
						}
					},
					y: {
						axisLabelWidth: 65
					}
				}
			}
		);

		this.dataId = props.data.id;
	}

	componentWillReceiveProps(nextProps){
		const update = {};
		const nextRange = nextProps.dateRange;

		if(nextRange){
			const currRange = this.graph.xAxisRange();

			if(!currRange || nextRange[0] != currRange[0] || nextRange[1] != currRange[1]){
				Object.assign(update, {dateWindow: nextRange});
			}
		}

		const nextData = nextProps.data;
		if(nextData && nextData.id != this.dataId){
			this.dataId = nextData.id;
			Object.assign(update, { file: nextProps.data.getData(), labels: nextProps.data.labels });
		}

		if(Object.keys(update).length > 0) this.graph.updateOptions(update);
	}

	rangeChangeHandler(graph){
		if(this.props.updateXRange) this.props.updateXRange(graph.xAxisRange());
	}

	render(){
		return (
			<div>
				<div ref="graphDiv" />
				<div ref="labelsDiv" style={{width:100 + '%', fontSize:0.9 + 'em', marginTop:5}}></div>
			</div>
		);
	}
}


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
	}

	componentWillReceiveProps(nextProps){
		this.graph.updateOptions( { file: nextProps.data.getData(), labels: nextProps.data.labels } );
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


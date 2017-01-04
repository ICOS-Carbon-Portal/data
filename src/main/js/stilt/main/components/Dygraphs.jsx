import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Dygraph from 'dygraphs';
import {deepMerge} from 'icos-cp-utils';


export default class Dygraphs extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount(){
		const props = this.props;

		this.dataId = props.data.id;

		this.graph = new Dygraph(
			ReactDOM.findDOMNode(this.refs.graphDiv),
			props.data.getData(),
			deepMerge({
				drawCallback: this.rangeChangeHandler.bind(this),
				dateWindow: props.dateRange,
				strokeWidth: 1,
				colorValue: 0.9,
				labels: this.makeLabels(props),
				legend: 'always',
				labelsDiv: ReactDOM.findDOMNode(this.refs.labelsDiv),
				labelsSeparateLines: false,
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						valueFormatter: this.formatDate.bind(this)
					},
					y: {
						axisLabelWidth: 65
					}
				},
				series: makeSeriesOpt(props.data.series),
				visibility: this.getVisibility(props)
			}, props.graphOptions)
		);
	}

	componentWillUnmount(){
		this.graph.destroy();
	}

	formatDate(ms){
		const formatter = this.props.dateFormatter;
		//Firefox hack: add empty bold string
		return '<b></b>' + formatter ? formatter(ms) : new Date(ms).toUTCString();
	}

	makeLabels(props){
		return props.data.series.map(s => s.label);
	}

	getVisibility(props){
		return computeVisibility(this.makeLabels(props).slice(1), props.visibility);
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
			Object.assign(update, {
				file: nextProps.data.getData(),
				labels: this.makeLabels(nextProps),
				series: makeSeriesOpt(nextProps.data.series)
			});
		}

		const nextVisibility = this.getVisibility(nextProps);
		if(!areEqualArrays(nextVisibility, this.getVisibility(this.props))){
			Object.assign(update, {visibility: nextVisibility});
		}

		const optionsWillUpdate = (Object.keys(update).length > 0);

		if(annotationsHaveBeenUpdated(this.props.annotations, nextProps.annotations)){
			this.graph.setAnnotations(nextProps.annotations, optionsWillUpdate); //avoiding double redrawing
		}

		if(optionsWillUpdate) this.graph.updateOptions(update);
	}

	rangeChangeHandler(graph){
		if(this.props.updateXRange) this.props.updateXRange(graph.xAxisRange());
	}

	render(){
		return (
			<div>
				<div ref="graphDiv" style={{width: '100%'}} />
				<div ref="labelsDiv" style={{width: '100%', fontSize: '0.9em', marginTop: 5}}></div>
			</div>
		);
	}
}

function computeVisibility(labels, visibilityObj){
	let visibility = visibilityObj || {};
	return labels.map(label => !!visibility[label]);
}

function areEqualArrays(a1, a2){
	if(!a1 || !a2 || a1.length !== a2.length) return false;
	return a1.every((a, i) => a === a2[i]);
}

function makeSeriesOpt(dyDataSeries){
	let opt = {};
	dyDataSeries.forEach((s, i) => {
		opt[s.label] = s.options;
	});
	return opt;
}

function annotationsHaveBeenUpdated(oldAnno, newAnno){
	if(!!oldAnno != !!newAnno) return true;
	if(!newAnno) return false;
	if(oldAnno.length != newAnno.length) return true;
	if(newAnno.length == 0) return false;

	return !oldAnno.every((oa, i) => oa.series == newAnno[i].series && oa.x == newAnno[i].x);
}


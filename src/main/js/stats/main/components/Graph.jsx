import React, { Component } from 'react';
import Radio from './Radio.jsx';
import deepEqual from 'deep-equal';


export default class Graph extends Component{
	constructor(props){
		super(props);

		this.chartDiv = undefined;
		this.labelsDiv = undefined;
	}

	componentDidUpdate(prevProps) {
		if(!deepEqual(this.props.statsGraph, prevProps.statsGraph)){
			renderGraph(this.chartDiv, this.labelsDiv, this.props.statsGraph);
		}
	}

	render(){
		const {radioAction, style} = this.props;
		const radios = [
			{txt: 'Per week', isActive: true, actionTxt: 'week'},
			{txt: 'Per month', isActive: false, actionTxt: 'month'},
			{txt: 'Per year', isActive: false, actionTxt: 'year'}
		];

		return (
			<div>
				<Radio
					horizontal={true}
					containerStyle={{margin:'0 0 10px 0'}}
					radios={radios}
					action={radioAction}
				/>
				<div ref={div => this.chartDiv = div} style={style} />
				<div ref={div => this.labelsDiv = div} style={{marginTop:5}} />
			</div>
		);
	}
}

const renderGraph = (chartDiv, labelsDiv, statsGraph) => {
	if (!statsGraph.hasData) {
		new Dygraph(
			chartDiv,
			",\n0,0",
			{
				drawYAxis:false,
				title:'No data available',
				pointSize: 0,
				highlightCircleSize: 0,
				showLabelsOnHighlight:false
			}
		);
		return;
	}

	const getDateWindow = data => {
		const oneDay = 1000 * 3600 * 24;
		if (data.length < 2) return [data[0][0].getTime() - oneDay, data[0][0].getTime() + oneDay];

		const span = Math.floor((data[1][0].getTime() - data[0][0].getTime()) / 2);
		const first = data[0][0].getTime() - span;
		const last = data[data.length - 1][0].getTime() + span;
		return [first, last];
	};

	const valueFrmtr = dateFormatter(statsGraph.dateUnit, statsGraph.weeks);
	const axisLabelFrmtr = dateFormatter(statsGraph.dateUnit);

	new Dygraph(
		chartDiv,
		statsGraph.data,
		{
			labels: ["date", "Downloads"],
			plotter: barChartPlotter,
			legend: 'always',
			labelsDiv: labelsDiv,
			labelsSeparateLines: false,
			dateWindow: getDateWindow(statsGraph.data),
			axes: {
				x: {
					axisLabelWidth: 80,
					valueFormatter: valueFrmtr,
					axisLabelFormatter: axisLabelFrmtr,
					pixelsPerLabel: 100,
				}
			}
		}
	);
};

const dateFormatter = (dateUnit, weeks) => {
	switch (dateUnit) {
		case 'week':
			return weeks && weeks.length
			? (ms, opts, seriesName, dygraph, row) => {
				return `${new Date(ms).toISOString().substring(0, 10)} (week ${weeks[row]})`;
			}
			: ms => {
					return new Date(ms).toISOString().substring(0, 10);
				};

		case 'month':
			return ms => {
				const date = new Date(ms);
				const locale = "en-us";
				return `${date.toLocaleString(locale, {month: "long"})} ${date.getFullYear()}`;
			};

		case 'year':
			return ms => new Date(ms).getFullYear();
	}
};

const barChartPlotter = (e => {
	const darkenColor = colorStr => {
		const color = Dygraph.toRGB_(colorStr);
		color.r = Math.floor((255 + color.r) / 2);
		color.g = Math.floor((255 + color.g) / 2);
		color.b = Math.floor((255 + color.b) / 2);
		return `rgb(${color.r},${color.g},${color.b})`;
	};

	const ctx = e.drawingContext;
	const points = e.points;
	const y_bottom = e.dygraph.toDomYCoord(0);

	ctx.fillStyle = darkenColor(e.color);

	let min_sep = Infinity;
	for (let i = 1; i < points.length; i++) {
		const sep = points[i].canvasx - points[i - 1].canvasx;
		if (sep < min_sep) min_sep = sep;
	}

	const bar_width = points.length >= 2
		? Math.floor((points.length / Math.pow(points.length, 1.1)) * min_sep)
		: 300;

	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		const center_x = p.canvasx;

		ctx.fillRect(center_x - bar_width / 2, p.canvasy, bar_width, y_bottom - p.canvasy);
		ctx.strokeRect(center_x - bar_width / 2, p.canvasy, bar_width, y_bottom - p.canvasy);
	}
});

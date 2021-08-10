import config from '../config';
import Dygraph from 'dygraphs';
import '../../../common/main/Dygraphs.css';


export default class {
	constructor(binTableData, value1Idx, value2Idx, graphElement, labelElement, graphMouseMove){
		this.graph = undefined;
		this._binTableData = binTableData;
		this._value1Idx = value1Idx;
		this._value2Idx = value2Idx;
		this._graphElement = graphElement;
		this._labelElement = labelElement;
		this._graphMouseMove = graphMouseMove;

		this._dataset = binTableData.allData;

		this._dateIdx = binTableData.getColumnIndex(config.dateColName);
		this._latitudeIdx = binTableData.getColumnIndex(config.latitudeColName);
		this._longitudeIdx = binTableData.getColumnIndex(config.longitudeColName);

		this.createGraph();
	}

	createGraph(){
		const dateFormatter = (ms, opts, seriesName, dygraph, row, col) => {
			const latitude = this._dataset[row][this._latitudeIdx];
			const longitude = this._dataset[row][this._longitudeIdx];
			this._graphMouseMove(latitude, longitude, row);

			const dateTime = new Date(ms).toISOString().split('T');
			return `${dateTime[0]} ${dateTime[1].substring(0, 5)}`;
		};

		const yLabel1 = this.getLabel(this._value1Idx);
		// Labels must be unique in dygraph
		const yLabel2 = this._value1Idx === this._value2Idx
			? ' ' + this.getLabel(this._value2Idx)
			: this.getLabel(this._value2Idx);

		this.graph = new Dygraph(
			this._graphElement,
			this.getData(),
			{
				height: 480,
				strokeWidth: 0,
				drawPoints: true,
				legend: 'always',
				labelsDiv: this._labelElement,
				labels: ['time', yLabel1, yLabel2],
				ylabel: yLabel1,
				y2label: yLabel2,
				labelsKMB: true,
				digitsAfterDecimal: 3,
				series: {
					[yLabel1]: {
						axis: 'y'
					},
					[yLabel2]: {
						axis: 'y2'
					}
				},
				axes: {
					x: {
						drawGrid: false,
						axisLabelWidth: 80,
						valueFormatter: dateFormatter,
						axisLabelFormatter: ms => new Date(ms).toISOString().substring(0, 10),
						pixelsPerLabel: 100
					},
					y: {
						axisLabelWidth: 80
					},
					y2: {
						axisLabelWidth: 80
					}
				}
			}
		);
	}

	getLabel(idx){
		return idx !== undefined
			? `${this._binTableData.column(idx).label} [${this._binTableData.column(idx).unit}]`
			: '';
	}

	updateGraph(value1Idx, value2Idx){
		this._value1Idx = value1Idx;
		this._value2Idx = value2Idx;
		const yLabel1 = this.getLabel(this._value1Idx);
		// Labels must be unique in dygraph
		const yLabel2 = value1Idx === value2Idx
			? ' ' + this.getLabel(this._value2Idx)
			: this.getLabel(this._value2Idx);

		this.graph.updateOptions({
			file: this.getData(),
			labels: ['time', yLabel1, yLabel2],
			ylabel: yLabel1,
			y2label: yLabel2,
			series: {
				[yLabel1]: {
					axis: 'y'
				},
				[yLabel2]: {
					axis: 'y2'
				}
			}
		});
	}

	getData(){
		return this._dataset.map(row => [new Date(row[this._dateIdx]), row[this._value1Idx], row[this._value2Idx]]);
	}
}

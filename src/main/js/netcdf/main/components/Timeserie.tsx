import React, { CSSProperties, useState } from 'react';
import Draggable from 'icos-cp-draggable';
import {drawGraph} from '../models/Dygraphs';
import deepequal from 'deep-equal';
import {ReactSpinner} from 'icos-cp-spinner';
import { Latlng, TimeserieData } from '../models/State';


const panelBodyHeight = 200;

type TimeserieProps = {
	isSites: boolean
	isActive: boolean
	varName?: string
	timeserieData?: TimeserieData[]
	latlng?: Latlng
	showTSSpinner: boolean
	isFetchingTimeserieData: boolean
	closeTimeserie: () => void
};

export default function Timeserie(props: TimeserieProps) {
	const [prevData, setPrevData] = useState(props.timeserieData);

	let [draggableStyle, setDraggableStyle] = useState<CSSProperties>({});
	const hasData = props.varName && props.timeserieData?.length && props.latlng;

	if (hasData && !deepequal(props.timeserieData, prevData)) {
		setPrevData(props.timeserieData);
		drawGraph(props.timeserieData, props.varName, props.latlng);
	}

	function onStopDrag(style: CSSProperties) {
		// save style in case the draggable is closed (for position)
		setDraggableStyle(style);
	}

	const {isSites, isActive, isFetchingTimeserieData, timeserieData, showTSSpinner, closeTimeserie} = props;
	const showDivNoData = !showTSSpinner && !isFetchingTimeserieData && isEmpty(timeserieData);

	return isActive
		?	<Draggable
				dragElementId="cp-drag-element"
				initialPos={initialPos(draggableStyle, 'map')}
				onStopDrag={onStopDrag}
			>
				<Panel
					isFetchingTimeserieData={isFetchingTimeserieData}
					showDivNoData={showDivNoData}
					isSites={isSites}
					showSpinner={showTSSpinner}
					closeTimeserie={closeTimeserie}
				/>
			</Draggable>
		: null;
}

const isEmpty = (timeserieData: TimeserieData[] | undefined) => {
	return !timeserieData || timeserieData.length === 0 || timeserieData.every(d => d[1] === 0 || d[1] === null);
};

function initialPos(draggableStyle: CSSProperties, parentElementId: string) {
	return (draggableRoot: HTMLElement) => {
		if ("left" in draggableStyle) {
			return draggableStyle;
		}

		let position: CSSProperties = {};
		const parentElement = document.getElementById(parentElementId);

		if (parentElement) {
			let {right, bottom} = parentElement.getBoundingClientRect();
			const draggableRect = draggableRoot.getBoundingClientRect();

			position = {
				top: bottom - draggableRect.height - 2,
				left: right - draggableRect.width - 2,
				height: draggableRect.height
			};
		}
		console.log("Running initialPos created function")
		console.log("Returning position")
		console.log(position);
		return position;
	}
};

type PanelProps = {
	isSites: boolean
	isFetchingTimeserieData: boolean
	showDivNoData: boolean
	showSpinner: boolean
	closeTimeserie: () => void
};

const Panel = ({isSites, isFetchingTimeserieData, showDivNoData, showSpinner, closeTimeserie}: PanelProps) => {
	const defaultGraphStyle = {border:'none', width:'100%', height:'100%'};
	const graphStyle = isFetchingTimeserieData || showDivNoData || showSpinner
		? Object.assign({}, defaultGraphStyle, {visibility:'hidden'})
		: defaultGraphStyle;
	const style: CSSProperties = {textAlign:'center', position:'relative', top:'40%'};

	return (
		<div className="card" style={{margin:0}}>
			<div id="cp-drag-element" className="card-header">
				<span id="graphLegend">&nbsp;</span>
				<CloseBtn closeTimeserie={closeTimeserie} />
			</div>

			<div className="card-body" style={{padding:'5px 2px', height: panelBodyHeight}}>
				{showDivNoData && <div style={style}>No data found at that location</div>}
				<div id="graph" style={graphStyle} />
				<ReactSpinner isSites={isSites} show={showSpinner} />
			</div>
		</div>
	);
};

const CloseBtn = ({closeTimeserie}: {closeTimeserie: () => void}) => {
	const style: CSSProperties = {float:'right', fontSize:22, cursor:'pointer'};
	const className = "fas fa-times-circle text-danger";
	const onClick = () => {
		closeTimeserie();
	};

	return <span style={style} className={className} onClick={onClick} title="Close" />;
};

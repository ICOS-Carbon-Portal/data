import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import Draggable from 'icos-cp-draggable';
import {drawGraph} from '../models/Dygraphs';
import deepequal from 'deep-equal';
import {ReactSpinner} from 'icos-cp-spinner';
import { Latlng, TimeserieData } from '../models/State';
import { useAppSelector } from '../store';


const panelBodyHeight = 200;

type TimeserieProps = {
	isSites: boolean
	isActive: boolean
	varName: string | undefined
	timeserieData: TimeserieData[] | undefined
	isFetchingTimeserieData: boolean
	latlng?: Latlng
	closeTimeserie: () => void
};

export default function Timeserie(props: TimeserieProps) {
	const {isSites, isActive, timeserieData, varName, closeTimeserie, isFetchingTimeserieData, latlng} = props;

	let [draggableStyle, setDraggableStyle] = useState<CSSProperties>({});

	const graphDiv = useRef<HTMLDivElement>(null);

	useEffect(() => {
		console.log("Timeserie UE");
		console.log(timeserieData);
		console.log(latlng)
		if (varName && timeserieData?.length && latlng && graphDiv.current) {
			console.log("we are calling drawGraph")
			drawGraph(timeserieData, varName, latlng);
		}
	}, [timeserieData, varName, latlng, graphDiv.current]);

	function onStopDrag(style: CSSProperties) {
		// save style in case the draggable is closed (for position)
		setDraggableStyle(style);
	}
	const showDivNoData = !isFetchingTimeserieData && timeserieData !== undefined && isEmpty(timeserieData);
	const defaultGraphStyle = {border:'none', width:'100%', height:'100%'};
	const graphStyle: CSSProperties = isFetchingTimeserieData || showDivNoData
		? {...defaultGraphStyle, visibility:'hidden'}
		: defaultGraphStyle;
	const textStyle: CSSProperties = {textAlign:'center', position:'relative', top:'40%'};

	return isActive
		?	<Draggable
				dragElementId="cp-drag-element"
				initialPos={initialPos(draggableStyle, 'map')}
				onStopDrag={onStopDrag}
			>
				<div className="card" style={{margin:0}}>
					<div id="cp-drag-element" className="card-header">
						<span id="graphLegend">&nbsp;</span>
						<CloseBtn closeTimeserie={closeTimeserie} />
					</div>

					<div className="card-body" style={{padding:'5px 2px', height: panelBodyHeight}}>
						{showDivNoData ? <div style={textStyle}>No data found at that location</div> : <></>}
						<div ref={graphDiv} id="graph" style={graphStyle} />
						<ReactSpinner isSites={isSites} show={isFetchingTimeserieData} />
					</div>
				</div>
			</Draggable>
		: null;
}

const isEmpty = (timeserieData: TimeserieData[]) => {
	return timeserieData.length === 0 || timeserieData.every(d => d[1] === 0 || d[1] === null);
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

		return position;
	}
}

const CloseBtn = ({closeTimeserie}: {closeTimeserie: () => void}) => {
	const style: CSSProperties = {float:'right', fontSize:22, cursor:'pointer'};
	const className = "fas fa-times-circle text-danger";
	const onClick = () => {
		closeTimeserie();
	};

	return <span style={style} className={className} onClick={onClick} title="Close" />;
};

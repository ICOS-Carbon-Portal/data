import React, { Component } from 'react';

const textMargin = 3;
const tickLength = 10;

export default class LegendAxis extends Component {
	constructor(props) {
		super(props);

		if (props.allowRanges) {
			this.isTouchSupported = 'ontouchstart' in window;
			this.startEvent = this.isTouchSupported ? 'touchstart' : 'mousedown';
			this.moveEvent = this.isTouchSupported ? 'touchmove' : 'mousemove';
			this.endEvent = this.isTouchSupported ? 'touchend' : 'mouseup';
			this.leaveEvent = this.isTouchSupported ? 'touchleave' : 'mouseleave';

			this.svg = undefined;
			this.selectedDragger = undefined;
			this.offset = {};
			this.transform = undefined;
			this.limiter = ty => true;
			this.rangeFilter = {};
			this.slidePos = {
				maxRange: 0,
				minRange: 0
			}
		}
	}

	componentDidMount() {
		if (this.props.allowRanges) {
			this.svg = document.getElementById("svg");

			document.addEventListener(this.startEvent, this.startDrag.bind(this));
			document.addEventListener(this.moveEvent, this.drag.bind(this));
			document.addEventListener(this.endEvent, this.endDrag.bind(this));
			document.addEventListener(this.leaveEvent, this.endDrag.bind(this));

			if (this.isTouchSupported) {
				document.addEventListener('touchcancel', this.endDrag.bind(this));
			}
		}
	}

	startDrag(ev){
		if (ev.target.id !== "maxRange" && ev.target.id !== "minRange") return;

		this.selectedDragger = ev.target;
		this.offset = getMousePosition(this.svg, ev);
		const transforms = this.selectedDragger.transform.baseVal;

		if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
			const translate = this.svg.createSVGTransform();
			translate.setTranslate(0, 0);
			this.selectedDragger.transform.baseVal.insertItemBefore(translate, 0);
		}

		this.transform = transforms.getItem(0);
		this.offset.y -= this.transform.matrix.f;

		const otherSliderId = this.selectedDragger.id === "maxRange" ? "minRange" : "maxRange";
		const otherTy = this.slidePos[otherSliderId];

		this.limiter = this.selectedDragger.id === "maxRange"
			? ty => ty >= 0 && ty < this.props.length && ty < otherTy + this.props.length
			: ty => ty < 0 && ty > -this.props.length && Math.abs(ty + this.props.length) > otherTy;
	}

	drag(ev){
		if (this.selectedDragger === undefined) return;

		ev.preventDefault();
		const coord = getMousePosition(this.svg, ev);
		const ty = coord.y - this.offset.y;

		if (this.limiter(ty))
			this.transform.setTranslate(0, ty);
		else
			this.transform.setTranslate(0, 0);
	}

	endDrag(ev){
		if (this.transform === undefined || this.selectedDragger === undefined) return;

		this.slidePos[this.selectedDragger.id] = this.transform.matrix.f;
		this.updateRangeFilter();
		this.selectedDragger = undefined;
	}

	updateRangeFilter(){
		if (this.props.rangeFilterChanged) {
			const id = this.selectedDragger.id;

			if (this.transform.matrix.f === 0){
				delete this.rangeFilter[id];
				this.props.rangeFilterChanged(this.rangeFilter);

			} else {
				const value = id === "maxRange"
					? this.props.length - this.transform.matrix.f
					: -this.transform.matrix.f;
				const dataVal = this.props.valueMaker(value);

				Object.assign(this.rangeFilter, {[id]: dataVal});
				this.props.rangeFilterChanged(this.rangeFilter);
			}
		}
	}

	render() {
		const props = this.props;
		const width = props.horizontal
			? props.length + props.margin * 2
			: props.width + 64 + textMargin;
		const height = props.horizontal
			? props.width + textMargin
			: props.length + props.margin * 2;
		const style = props.horizontal
			? {position: 'relative', top: -5, fontSize: 12}
			: {position: 'relative', left: -props.width, fontSize: 12};
		const decimals = props.decimals
			? props.decimals
			: 0;

		return (
			<svg id="svg" className="axis" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
				<Ticks
					suggestedTickLocations={props.suggestedTickLocations}
					horizontal={props.horizontal}
					valueMaker={props.valueMaker}
					margin={props.margin}
					decimals={decimals}
					width={props.width}
					height={height}
				/>
				<MaxRange
					allowRanges={props.allowRanges}
					horizontal={props.horizontal}
					margin={props.margin}
					width={props.width}
				/>
				<MinRange
					allowRanges={props.allowRanges}
					horizontal={props.horizontal}
					margin={props.margin}
					width={props.width}
					height={height}
				/>
			</svg>
		);
	}
}

const valueFormatter = (value, decimals) => {
	return value > -1000 && value < 1000
		? Number.isInteger(value)
			? value
			: Math.floor(value * 1000) > 0
				? value.toFixed(decimals)
				: value.toExponential(decimals)
		: value.toExponential(decimals);
};

const Ticks = ({suggestedTickLocations, horizontal, valueMaker, margin, decimals, width, height}) => {
	if (suggestedTickLocations === undefined || suggestedTickLocations.length === 0) return null;

	return suggestedTickLocations.map((tick, idx) => {
		const tickVal = valueFormatter(valueMaker(tick), decimals);

		return (
			horizontal
				? <g key={idx}>
					<line x1={tick + margin} y1={0} x2={tick + margin} y2={tickLength} stroke="black" strokeWidth="2" />
					<text x={tick + margin} y={width + textMargin} textAnchor="middle">{tickVal}</text>
				</g>
				: <g key={idx}>
					<line y1={tick + margin} x1={width} y2={tick + margin} x2={width + tickLength} stroke="black" strokeWidth="2" />
					<text y={height - tick - margin} x={tickLength + textMargin + width} textAnchor="start" dy="0.3em">{tickVal}</text>
				</g>
		);
	})
};

const rangeMarkerScale = 0.7;

const MaxRange = ({allowRanges, horizontal, margin, width}) => {
	if (!allowRanges || horizontal) return null;

	const d = `M0 ${margin} H${width} L${width/2} ${width * rangeMarkerScale + margin} Z`;

	return (
		<path id="maxRange" d={d} style={{stroke: 'black', strokeWidth: 1, fill: 'gold', cursor: 'ns-resize'}} />
	);
};

const MinRange = ({allowRanges, horizontal, margin, width, height}) => {
	if (!allowRanges || horizontal) return null;

	const d = `M0 ${height - margin} H${width} l${-width/2} ${-width * rangeMarkerScale} Z`;

	return (
		<path id="minRange" d={d} style={{stroke: 'black', strokeWidth: 1, fill: 'gold', cursor: 'ns-resize'}} />
	);
};



function getMousePosition(svg, ev) {
	const CTM = svg.getScreenCTM();
	return {
		x: (ev.clientX - CTM.e) / CTM.a,
		y: (ev.clientY - CTM.f) / CTM.d
	};
}



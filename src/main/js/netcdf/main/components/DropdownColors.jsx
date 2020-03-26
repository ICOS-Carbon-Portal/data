import React, { Component } from 'react';


export default class DropdownColors extends Component{
	constructor(props){
		super(props);

		this.state = {
			dropdownOpen: false
		};

		this.outsideClickHandler = this.handleOutsideClick.bind(this);
		document.addEventListener('click', this.outsideClickHandler, false);
	}

	handleOutsideClick(e){
		if (this.node && !this.node.contains(e.target) && this.state.dropdownOpen) {
			this.setState({dropdownOpen: false});
		}
	}

	onDropdownClick(){
		this.setState({dropdownOpen: !this.state.dropdownOpen});
	}

	onDropDownItemClick(selectedItemKey){
		if (this.props.action) {
			this.setState({dropdownOpen: !this.state.dropdownOpen});
			this.props.action(selectedItemKey);
		}
	}

	componentWillUnmount(){
		document.removeEventListener('click', this.outsideClickHandler, false);
	}

	render(){
		const {dropdownOpen} = this.state;
		const {control} = this.props;
		const nodeClass = dropdownOpen ? 'dropdown open' : 'dropdown';
		const selectedColorRamp = control.colorRamps[control.selectedIdx];
		const selectedColorMaker = selectedColorRamp ? selectedColorRamp.colorMaker : undefined;
		const getLegend = selectedColorMaker ? selectedColorMaker.getLegend.bind(selectedColorMaker) : null;

		return (
			<span ref={div => this.node = div} className={nodeClass} style={{display: 'inline-block', zIndex:9999}}>
				<Button clickAction={this.onDropdownClick.bind(this)} getLegend={getLegend} />

				<ul className="dropdown-menu">{
					control.colorRamps.map((cr, idx) => {
						return (
							<ListItem
								key={idx}
								onClick={this.onDropDownItemClick.bind(this, idx)}
								cr={cr}
							/>);
					})
				}</ul>
			</span>
		);
	}
}

const Button = ({clickAction, getLegend, label = 'Select option'}) => {
	const btnCls = 'btn btn-default dropdown-toggle';
	const lbl = getLegend
		? <img src={renderCanvas(120, 15, getLegend)} />
		: <span>{label}</span>;

	return (
		<button className={btnCls} type="button" onClick={clickAction}>
			{lbl} <span className="caret" />
		</button>
	);
};

const ListItem = ({onClick, cr}) => {
	const getLegend = cr.colorMaker ? cr.colorMaker.getLegend.bind(cr.colorMaker) : null;
	const child = getLegend
		? <img src={renderCanvas(120, 15, getLegend)} />
		: cr.name;

	return (
		<li>
			<a onClick={onClick} style={{ cursor: 'pointer' }}>{child}</a>
		</li>
	);
};

const renderCanvas = (width, height, getLegend) => {
	const {colorMaker} = getLegend(0, 119);

	const canvas = document.createElement("canvas");

	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (let i = 0; i < width; i++) {
		const color = colorMaker(i);
		const rgba = `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${Math.round(color[3])})`;
		ctx.strokeStyle = rgba;
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i, height);
		ctx.stroke();
	}

	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

	return canvas.toDataURL();
};

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

	onDropDownItemClick(selectedIdx){
		if (this.props.action) {
			this.setState({dropdownOpen: !this.state.dropdownOpen});
			this.props.action(selectedIdx);
		}
	}

	componentWillUnmount(){
		document.removeEventListener('click', this.outsideClickHandler, false);
	}

	render(){
		const {dropdownOpen} = this.state;
		const {control} = this.props;
		const dropDownMenuCls = `dropdown-menu${dropdownOpen ? ' show' : ''}`;
		const colorMap = control.selected

		return (
			<span ref={div => this.node = div} className="dropdown" style={{display: 'inline-block', zIndex:750}}>
				<Button dropdownOpen={dropdownOpen} clickAction={this.onDropdownClick.bind(this)} colorMap={colorMap} />

				<ul className={dropDownMenuCls}>{
					control.values.map((cm, idx) => {
						return (
							<ListItem
								key={idx}
								idx={idx}
								selectedIdx={control.selectedIdx}
								onClick={this.onDropDownItemClick.bind(this, idx)}
								colorMap={cm}
							/>);
					})
				}</ul>
			</span>
		);
	}
}

const Button = ({dropdownOpen, clickAction, colorMap}) => {
	const btnCls = `btn btn-outline-secondary dropdown-toggle${dropdownOpen ? ' show' : ''}`;
	const lbl = colorMap
		? <img src={renderCanvas(120, 15, colorMap)} />
		: <span>Select option</span>
	const title = colorMap?.name
	return (
		<button className={btnCls} type="button" onClick={clickAction} title={title}>
			{lbl} <span className="caret" />
		</button>
	);
};

const ListItem = ({onClick, colorMap, idx, selectedIdx}) => {
	const style = selectedIdx === idx
		? {backgroundColor: 'rgb(200,200,200)'}
		: {};

	return (
		<li className="dropdown-item" style={style} title={colorMap.name}>
			<a onClick={onClick} style={{cursor:'pointer', display:'inline', verticalAlign:'super'}}>
				<img src={renderCanvas(120, 15, colorMap)}/>
			</a>
		</li>
	);
};

const renderCanvas = (width, height, colorMap) => {
	const colorMaker = colorMap.getColormapSelectColorMaker(0, width - 1)

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

import React, { useEffect, useRef, useState } from 'react';
import { ColormapControl } from '../models/ControlsHelper';
import Colormap from '../models/Colormap';

type DropdownColorsProps = {
	control: ColormapControl
	action: (newIdx: number) => void
};

export default function DropdownColors(props: DropdownColorsProps) {


	function onDropdownClick(e: React.MouseEvent<HTMLButtonElement>) {
		setDropdownOpen(!dropdownOpen);
	}

	function onDropDownItemClick(selectedIdx: number) {
		if (props.action) {
			setDropdownOpen(!dropdownOpen);
			props.action(selectedIdx);
		}
	}

	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		function handleOutsideClick(e: Event) {
			if (node.current && !node.current.contains(e.target as Node) && dropdownOpen) {
				setDropdownOpen(false);
			}
		}

		document.addEventListener('click', handleOutsideClick, false);
		return () => document.removeEventListener('click', handleOutsideClick, false);
	});

	const {control} = props;
	const dropDownMenuCls = `dropdown-menu${dropdownOpen ? ' show' : ''}`;
	const colorMap = control.selected
	const node = useRef<HTMLSpanElement | null>(null);

	return (
		<span ref={node} className="dropdown" style={{display: 'inline-block', zIndex: 750}}>
			<Button dropdownOpen={dropdownOpen} clickAction={onDropdownClick} colorMap={colorMap} />

			<ul className={dropDownMenuCls}>{
				control.values.map((cm, idx) => {
					return (
						<ListItem
							key={idx}
							idx={idx}
							selectedIdx={control.selectedIdx}
							onClick={() => onDropDownItemClick(idx)}
							colorMap={cm}
						/>);
				})
			}</ul>
		</span>
	);
}

type ButtonProps = {
	dropdownOpen: boolean
	clickAction: React.MouseEventHandler
	colorMap: Colormap | null
};

const Button = ({dropdownOpen, clickAction, colorMap}: ButtonProps) => {
	const btnCls = `btn btn-outline-secondary dropdown-toggle${dropdownOpen ? ' show' : ''}`;
	const lbl = colorMap
		? <img src={renderCanvas(120, 15, colorMap)} />
		: <span>Select option</span>;
	const title = colorMap?.name;
	return (
		<button className={btnCls} type="button" onClick={clickAction} title={title}>
			{lbl} <span className="caret" />
		</button>
	);
};

type ListItemProps = {
	idx: number
	selectedIdx: number | null
	colorMap: Colormap
	onClick: React.MouseEventHandler
}

const ListItem = ({onClick, colorMap, idx, selectedIdx}: ListItemProps) => {
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

const renderCanvas = (width: number, height: number, colorMap: Colormap) => {
	const colorMaker = colorMap.getColormapSelectColorMaker(0, width - 1)

	const canvas = document.createElement("canvas");

	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');

	if (ctx === null) {
		return;
	}

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

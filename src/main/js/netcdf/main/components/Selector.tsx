import React, { ChangeEvent, Component, CSSProperties } from 'react';
import { Control } from '../models/ControlsHelper';
import { VariableInfo } from '../backend';

type ControlData = {

}

type SelectorProps<T> = {
	className?: string
	caption: string
	control: Control<T>
	presenter: (v: T) => (string)
	action: (newIdx: number) => void
}

export default function Selector<T>(props: SelectorProps<T>) {
	const control = props.control;

	const style: CSSProperties = {visibility: (control.values.length > 0) ? "visible" : "hidden"};

	const selectedOption = control.selected === null ? props.caption : control.selected;

	function changeHandler(event: ChangeEvent<HTMLSelectElement>) {
		if(props.action) props.action(event.target.selectedIndex);
	}

	return <div className={props.className} style={style}>

		<label className='form-label fw-bold text-nowrap'>{props.caption}</label>

		<select value={control.selected ? props.presenter(control.selected) : props.caption} className="form-select" onChange={changeHandler}>{

			control.values.map(function(optionValue, i){
				return <option key={i}>{props.presenter(optionValue)}</option>;
			})

		}</select>

	</div>;
}

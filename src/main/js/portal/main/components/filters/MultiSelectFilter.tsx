import React, {Component} from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';
import { Obj } from '../../../../common/main/types';
import { UrlStr } from '../../backend/declarations';
import HelpButton from "../../containers/help/HelpButton";

type Props = {
	name: string
	search: Obj<any>
	updateFilter: (name: any, values: any[]) => void
	placeholder: string
	data: any[]
	value: any[]
}

type State = {
	open: boolean
}

export default class MultiSelectFilter extends Component<Props, State> {
	private search: Obj<any>
	private itemCount?: number

	constructor(props: Props){
		super(props);

		this.search = props.search;
		this.itemCount = undefined;

		this.state = {
			open: false
		};
	}

	handleChange(name: string, values: (string | Obj)[]){
		this.itemCount = values.length;
		this.props.updateFilter(name, values.map(v => typeof v === 'object' ? v.value : v));
		this.setState({open: false});
	}

	handleToggle(value: string[]){
		const open = this.itemCount === value.length - 1
			? false
			: !this.state.open;

		this.setState({open});
	}

	handleSearch(name: string, value: string){
		this.search[name] = value;
	}

	listItem(name: string, props: Obj){
		const text = props.text.toLowerCase();
		const searchStr = this.search[name] ? this.search[name].toLowerCase() : undefined;
		const start = text.indexOf(searchStr);

		if (start < 0) {
			return (
				<>
					<span>{props.text}</span>
					{this.helpBtn(name, props.value)}
				</>
			);
		} else if (start === 0) {
			return (
				<>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
					{this.helpBtn(name, props.value)}
				</>
			);
		} else {
			return (
				<>
					<span>{props.text.slice(0, start)}</span>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
					{this.helpBtn(name, props.value)}
				</>
			);
		}
	}

	helpBtn(name: string, urlStr: UrlStr){
		if ((name === "type" || name === "ecosystem") && urlStr){
			return (
				<HelpButton
					name={name}
					url={urlStr}
				/>
			);
		} else {
			return null;
		}
	}

	tagItem(name: string, props: Obj<any>){
		const textItem = typeof props.item === 'object' ? props.item : {text: props.item};
		
		// Key word filter is not affected by other filters
		return typeof props.item === 'object' || name === "keywordFilter"
			? <><span>{textItem.text}</span>{this.helpBtn(name, textItem.value)}</>
			: <><span style={{color: 'gray'}} title="Not present with current filters">{textItem.text}</span>{this.helpBtn(name, textItem.value)}</>;
	}

	render(){
		const {open} = this.state;
		const {placeholder, data, value, name} = this.props;

		return (
			<Multiselect
				open={open}
				placeholder={placeholder}
				valueField="value"
				textField="text"
				data={data}
				value={value}
				filter="contains"
				onChange={this.handleChange.bind(this, name)}
				onSearch={this.handleSearch.bind(this, name)}
				onToggle={this.handleToggle.bind(this, value)}
				itemComponent={this.listItem.bind(this, name)}
				tagComponent={this.tagItem.bind(this, name)}
			/>
		);
	}
}

import React, {Component, Fragment} from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';


export default class MultiSelectFilter extends Component {
	constructor(props){
		super(props);

		this.search = props.search;
	}

	handleChange(name, values){
		this.props.updateFilter(name, values.map(v => typeof v === 'object' ? v.value : v));
	}

	handleSearch(name, value){
		this.search[name] = value;
	}

	listItem(name, props){
		const text = props.text.toLowerCase();
		const searchStr = this.search[name] ? this.search[name].toLowerCase() : undefined;
		const start = text.indexOf(searchStr);

		if (start < 0) {
			return props.text;
		} else if (start === 0) {
			return (
				<Fragment>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
				</Fragment>
			);
		} else {
			return (
				<Fragment>
					<span>{props.text.slice(0, start)}</span>
					<strong>{props.text.slice(start, start + searchStr.length)}</strong>
					<span>{props.text.slice(start + searchStr.length)}</span>
				</Fragment>
			);
		}
	}

	tagItem({item}){
		const textItem = typeof item === 'object' ? item : {text: item};

		return typeof item === 'object'
			? <span style={{marginRight: 2}}>{textItem.text}</span>
			: <span style={{marginRight: 2, color: 'gray'}} title="Not present with current filters">{textItem.text}</span>;
	}

	render(){
		const {placeholder, data, value, name} = this.props;

		return (
			<Multiselect
				placeholder={placeholder}
				valueField="value"
				textField="text"
				data={data}
				value={value}
				filter="contains"
				onChange={this.handleChange.bind(this, name)}
				onSearch={this.handleSearch.bind(this, name)}
				itemComponent={this.listItem.bind(this, name)}
				tagComponent={this.tagItem.bind(this)}
			/>
		);
	}
}

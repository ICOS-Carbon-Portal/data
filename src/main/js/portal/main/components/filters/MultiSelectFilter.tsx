import React, {Component} from 'react';
import { RenderItemProp } from 'react-widgets/esm/List';
import Multiselect from 'react-widgets/Multiselect';
import { Obj } from '../../../../common/main/types';
import HelpButton from "../../containers/help/HelpButton";
import { ColNames } from '../../models/CompositeSpecTable';
import { HelpItemName } from '../../models/HelpStorage';
import { Value } from '../../models/SpecTable';
import { Item } from './MultiselectCtrl';

type Props = {
	name: ColNames | 'keywordFilter'
	shouldUseExternalListEntry: boolean
	search: Obj
	updateFilter: (name: ColNames | 'keywordFilter', values: Value[]) => void
	placeholder: string
	data: Item[]
	value: Item[]
}

type State = {
	open: boolean
}

type RenderItem = Parameters<RenderItemProp<Item>>[0];

export default class MultiSelectFilter extends Component<Props, State> {
	private search: Obj<string, ColNames | 'keywordFilter'>;
	private itemCount?: number;

	constructor(props: Props){
		super(props);

		this.search = props.search;
		this.itemCount = undefined;

		this.state = {
			open: false
		};
	}

	handleChange(name: ColNames | 'keywordFilter', items: Item[]){
		this.itemCount = items.length;
		this.props.updateFilter(name, items.map(item => item.value));
		this.setState({open: false});
	}

	handleToggle(items: Item[]){
		const open = this.itemCount === items.length - 1
			? false
			: !this.state.open;

		this.setState({open});
	}

	handleSearch(name: ColNames | 'keywordFilter', value: string){
		this.search[name] = value;
	}

	renderListItem(name: ColNames | 'keywordFilter', shouldUseExternalListEntry: boolean, { item }: RenderItem){
		const {text} = item;
		const searchStr = this.search[name] ? this.search[name].toLowerCase() : '';
		const start = searchStr === ''
			? -1
			: text.toLowerCase().indexOf(searchStr);

		if (start < 0) {
			return (
				<>
					<span>{text}</span>
					{this.helpBtn(name, shouldUseExternalListEntry, item)}
				</>
			);
		} else if (start === 0) {
			return (
				<>
					<strong>{text.slice(start, start + searchStr.length)}</strong>
					<span>{text.slice(start + searchStr.length)}</span>
					{this.helpBtn(name, shouldUseExternalListEntry, item)}
				</>
			);
		} else {
			return (
				<>
					<span>{text.slice(0, start)}</span>
					<strong>{text.slice(start, start + searchStr.length)}</strong>
					<span>{text.slice(start + searchStr.length)}</span>
					{this.helpBtn(name, shouldUseExternalListEntry, item)}
				</>
			);
		}
	}

	helpBtn(name: ColNames | HelpItemName, shouldUseExternalListEntry: boolean, item: Item){
		const {text, value, helpStorageListEntry} = item;

		return shouldUseExternalListEntry && helpStorageListEntry.length
			? <HelpButton url={value + ''} title="Click to toggle help" name={name} helpContent={{url: value + '', main: text, helpStorageListEntry}} />
			: null;
	}

	renderTagValue(name: ColNames | HelpItemName, shouldUseExternalListEntry: boolean, hasData: boolean, props: {item: Item}){
		const {text} = props.item;

		// Key word filter is not affected by other filters
		return hasData || name === "keywordFilter"
			? <><span>{text}</span>{this.helpBtn(name, shouldUseExternalListEntry, props.item)}</>
			: <>
				<span style={{color: 'gray'}} title="Not present with current filters">{text}</span>
				{this.helpBtn(name, shouldUseExternalListEntry, props.item)}
			</>;
	}

	render(){
		const {open} = this.state;
		const {placeholder, data, value, name, shouldUseExternalListEntry} = this.props;

		return (
			<Multiselect
				open={open}
				placeholder={placeholder}
				textField="text"
				data={data}
				value={value}
				filter="contains"
				onChange={this.handleChange.bind(this, name)}
				onSearch={this.handleSearch.bind(this, name)}
				onToggle={this.handleToggle.bind(this, value)}
				renderListItem={this.renderListItem.bind(this, name, shouldUseExternalListEntry)}
				renderTagValue={this.renderTagValue.bind(this, name, shouldUseExternalListEntry, data.length > 0)}
			/>
		);
	}
}

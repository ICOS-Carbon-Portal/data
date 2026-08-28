import React, {Component} from 'react';
import { Multiselect } from '@icos-cp/multiselect';
import HelpButton from "../../containers/help/HelpButton";
import { ColNames } from '../../models/CompositeSpecTable';
import { HelpItemName } from '../../models/HelpStorage';
import { Value } from '../../models/SpecTable';
import { Item } from './MultiselectCtrl';

type Props = {
	name: ColNames | 'keywordFilter'
	shouldUseExternalListEntry: boolean
	updateFilter: (name: ColNames | 'keywordFilter', values: Value[]) => void
	placeholder: string
	data: Item[]
	value: Item[]
}

type State = {
	open: boolean
}

export default class MultiSelectFilter extends Component<Props, State> {

	constructor(props: Props){
		super(props);

		this.state = {
			open: false
		};
	}

	handleChange(name: ColNames | 'keywordFilter', items: Item[]){
		this.props.updateFilter(name, items.map(item => item.value));
		this.setState({open: false});
	}

	handleToggle(open: boolean){
		this.setState({open});
	}

	renderListItem(name: ColNames | 'keywordFilter', shouldUseExternalListEntry: boolean, { item, searchTerm }: {item: Item, searchTerm: string}){
		const {text} = item;
		const searchStr = searchTerm.toLowerCase();
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
			? <HelpButton url={value + ''} name={name} helpContent={{url: value + '', main: text, helpStorageListEntry}} />
			: null;
	}

	renderTagValue(name: ColNames | HelpItemName, shouldUseExternalListEntry: boolean, props: {item: Item}){
		const {text, presentWithCurrentFilters} = props.item;

		// Key word filter is not affected by other filters
		return presentWithCurrentFilters || name === "keywordFilter"
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
				dataKey="value"
				data={data}
				value={value}
				onChange={this.handleChange.bind(this, name)}
				onToggle={this.handleToggle.bind(this)}
				renderListItem={this.renderListItem.bind(this, name, shouldUseExternalListEntry)}
				renderTagValue={this.renderTagValue.bind(this, name, shouldUseExternalListEntry)}
			/>
		);
	}
}

import React from 'react';
import config, {placeholders, filters, CategoryType, CategoryNamesDict} from '../config';
import Slider from './ui/Slider.jsx';
import HelpButton from './help/HelpButton.jsx';
import MultiSelectFilter from "./controls/MultiSelectFilter.jsx";
import {IKeyValStrPairs, IKeyOptVal} from "../typescript/interfaces";

interface ISpecTable {
	names: CategoryType[];
	findTable(name: string): { [key: string]: IKeyValStrPairs[] };
	getFilter(name: string): string[];
	getDistinctAvailableColValues(name: string): string[];
	getColLabelNamePair(name: string): [string, string];
}

interface IObjSpecFilterProps {
	search: CategoryNamesDict;
	specTable: ISpecTable;
	helpStorage: any;
	getResourceHelpInfo: Function;
	specFiltersReset: Function;
	updateFilter: Function;
}

function typedKeys<T extends object>(o: T): Array<keyof T> {
	return Object.keys(o) as any;
}
export default class ObjSpecFilter extends React.Component<IObjSpecFilterProps> {

	search: {[C in CategoryType]?: any} //values are set by MultiSelectFilter

	constructor(props: IObjSpecFilterProps) {
		super(props);
		this.search = {};
	}

	getCtrl(name: CategoryType, labelName: string){
		const {specTable, helpStorage, getResourceHelpInfo} = this.props;

		const lookupTable: {[key: string]: any} = {};

		if (specTable) {
			const colTbl = specTable.findTable(name);
			if (colTbl) colTbl.rows.forEach(row => {
				lookupTable[row[name]] = row[labelName];
			});
		}

		const filterUris = specTable.getFilter(name);
		const data = specTable
			? specTable.getDistinctAvailableColValues(name)
				.map(value => {return {value, text: lookupTable[value]};})
			: [];
		const value = filterUris.map(uri => data.some(d => d.value === uri) ? uri : lookupTable[uri]);

		if (data[0]) {
			typeof data[0].text === "string"
				? data.sort((d1, d2) => d1.text.localeCompare(d2.text))
				: data.sort((d1, d2) => d1.text - d2.text);
		}

		const placeholder = data.length === 1
			? `${data[0].text}`
			: `(${data.length} items)`;

		return (
			<div className="row" key={name} style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>{placeholders[config.envri][name]}</label>

					<HelpButton
						isActive={helpStorage.isActive(name)}
						helpItem={helpStorage.getHelpItem(name)}
						title="Click to toggle help"
						getResourceHelpInfo={getResourceHelpInfo}
					/>

					<MultiSelectFilter
						name={name}
						search={this.search}
						updateFilter={this.props.updateFilter}
						placeholder={placeholder}
						data={data}
						value={value}
					/>
				</div>
			</div>
		);
	}

	render(){
		const {specTable, specFiltersReset} = this.props;
		const colNames = specTable.names.filter(name => !!placeholders[config.envri][name]);
		const activeFilters = colNames.map(colName => specTable.getFilter(colName));
		const resetBtnEnabled = !!activeFilters.reduce((acc, curr) => {
			return acc + curr.length;
		}, 0);
		const availableFilters = filters[config.envri];

		return (
			<div>
				<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={specFiltersReset} />

				{availableFilters.map((filterPanel, i) =>
					<FilterPanel
						key={"filter_" + i}
						header={filterPanel.panelTitle}
						nameList={getNameList(specTable, filterPanel.filterList)}
						colNames={colNames}
						getCtrl={this.getCtrl.bind(this)}
					/>
				)}

			</div>
		);
	}
}

interface IFilterPanel {
	header: string,
	nameList: [string, string][],
	colNames: string[],
	getCtrl: Function,
	startCollapsed?: boolean
}

const FilterPanel = ({ header, nameList, colNames, getCtrl, startCollapsed = false }: IFilterPanel) => {
	if (colNames.length === 0) return null;

	return (
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">{header}</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{nameList.map(name => getCtrl(...name))}
				</div>
			</Slider>
		</div>
	);
};

interface IResetBtn {
	resetFiltersAction: Function,
	enabled: boolean
}

const ResetBtn = ({ resetFiltersAction, enabled }: IResetBtn) => {
	const className = enabled ? 'btn btn-link' : 'btn btn-link disabled';
	const style = enabled
		? {margin: '5px 2px', textDecoration: 'underline', cursor: 'pointer'}
		: {margin: '5px 2px', textDecoration: 'underline'};
	const onClick = () => enabled ? resetFiltersAction() : {};

	return <div style={{textAlign: 'right'}}><button className={className} style={style} onClick={onClick}>Clear categories</button></div>;
};

const getNameList = (specTable: ISpecTable, list: string[]) => {
	return list.map(colName => specTable.getColLabelNamePair(colName));
};

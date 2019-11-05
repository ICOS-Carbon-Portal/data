import React, {Component} from 'react';
import config, {placeholders, filters, CategoryType} from '../config';
import Slider from './ui/Slider.jsx';
import HelpButton from './help/HelpButton.jsx';
import MultiSelectFilter from "./controls/MultiSelectFilter.jsx";
import {ReducedProps} from "../containers/Search";
import {PickClassFunctions, UrlStr} from "../backend/declarations";


type OwnProps = ReducedProps['objSpecFilter'] & {tabHeader: string};
type ObjSpecFilterActions = PickClassFunctions<typeof ObjSpecFilter>;

export default class ObjSpecFilter extends Component<OwnProps> {

	search: {[C in CategoryType]?: any} = {}; //values are set by MultiSelectFilter

	getCtrl(name: CategoryType, labelName: string){
		const {specTable, helpStorage, getResourceHelpInfo} = this.props;

		const lookupTable: {[key: string]: any} = {};

		if (specTable) {
			const colTbl = specTable.findTable(name);
			if (colTbl) colTbl.rows.forEach((row: any) => {
				lookupTable[row[name]] = row[labelName];
			});
		}

		const filterUris = specTable.getFilter(name);
		const data = specTable
			? specTable.getDistinctAvailableColValues(name)
				.map((value: string) => {return {value, text: lookupTable[value]};})
			: [];
		const value = filterUris.map((uri: UrlStr) => data.some((d: any) => d.value === uri) ? uri : lookupTable[uri]);

		if (data[0]) {
			typeof data[0].text === "string"
				? data.sort((d1: any, d2: any) => d1.text.localeCompare(d2.text))
				: data.sort((d1: any, d2: any) => d1.text - d2.text);
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
		const colNames = specTable.names.filter((name: string) => !!placeholders[config.envri][name]);
		const activeFilters = colNames.map(colName => specTable.getFilter(colName));
		const resetBtnEnabled = !!activeFilters.reduce((acc, curr) => {
			return acc + curr.length;
		}, 0);
		const availableFilters = filters[config.envri];

		return (
			<div>
				<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={specFiltersReset} />

				{availableFilters.map((filterPanel: any, i: number) =>
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

interface FilterPanel {
	header: string,
	nameList: [string, string][],
	colNames: string[],
	getCtrl: ObjSpecFilterActions['getCtrl'],
	startCollapsed?: boolean
}

const FilterPanel = ({ header, nameList, colNames, getCtrl, startCollapsed = false }: FilterPanel) => {
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

interface ResetBtn {
	resetFiltersAction: Function,
	enabled: boolean
}

const ResetBtn = ({ resetFiltersAction, enabled }: ResetBtn) => {
	const className = enabled ? 'btn btn-link' : 'btn btn-link disabled';
	const style = enabled
		? {margin: '5px 2px', textDecoration: 'underline', cursor: 'pointer'}
		: {margin: '5px 2px', textDecoration: 'underline'};
	const onClick = () => enabled ? resetFiltersAction() : {};

	return <div style={{textAlign: 'right'}}><button className={className} style={style} onClick={onClick}>Clear categories</button></div>;
};

const getNameList = (specTable: OwnProps['specTable'], list: ReadonlyArray<string>): [string, string][] => {
	return list.map((colName: string) => specTable.getColLabelNamePair(colName) as [string, string]);
};

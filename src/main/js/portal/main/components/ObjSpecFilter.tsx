import React, {Component, Fragment} from 'react';
import config, {placeholders, filters, CategoryType} from '../config';
import Slider from './ui/Slider.jsx';
import HelpButton from './help/HelpButton.jsx';
import MultiSelectFilter from "./controls/MultiSelectFilter.jsx";
import {ReducedProps} from "../containers/Search";
import {PickClassFunctions, UrlStr} from "../backend/declarations";
import PickDates from "./filters/PickDates";
import CheckBtn from "./buttons/ChechBtn";


type OwnProps = ReducedProps['objSpecFilter'] & {tabHeader: string};
type ObjSpecFilterActions = PickClassFunctions<typeof ObjSpecFilter>;

export default class ObjSpecFilter extends Component<OwnProps> {

	search: {[C in CategoryType]?: any} = {}; //values are set by MultiSelectFilter

	getMultiselectCtrl(name: CategoryType, labelName: string){
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

	getTemporalCtrls(){
		return (
			<Fragment>
				<PickDates
					filterTemporal={this.props.filterTemporal}
					setFilterTemporal={this.props.setFilterTemporal}
					category="dataTime"
					header="Data sampled"
				/>
				<PickDates
					marginTop={25}
					filterTemporal={this.props.filterTemporal}
					setFilterTemporal={this.props.setFilterTemporal}
					category="submission"
					header="Submission of data"
				/>
			</Fragment>
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
				<div className="row" style={{marginLeft:0}}>
					<div className="col-lg-9 col-md-12 col-sm-12 col-xs-12 text-nowrap" style={{padding:'10px 12px'}}>
						<CheckBtn onClick={() => {}} isChecked={true} style={{margin:'5px 2px', fontSize:10}} />
						<span style={{marginLeft:3, paddingRight:5}}>Show deprecated objects</span>
					</div>
					<div className="col-lg-3 col-md-12 col-sm-12 col-xs-12 text-nowrap" style={{padding:'6px 20px'}}>
						<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={specFiltersReset} />
					</div>
				</div>

				{availableFilters.map((filterPanel, i: number) =>
					<FilterPanelMultiselect
						key={"filter_" + i}
						header={filterPanel.panelTitle}
						nameList={getNameList(specTable, filterPanel.filterList as string[])}
						colNames={colNames}
						getMultiselectCtrl={this.getMultiselectCtrl.bind(this)}
					/>
				)}

				<FilterPanel
					header="Temporal filters"
					contentGenerator={this.getTemporalCtrls.bind(this)}
				/>

			</div>
		);
	}
}

interface FilterPanel {
	header: string
	contentGenerator: Function
	startCollapsed?: boolean
}

const FilterPanel = ({ header, contentGenerator, startCollapsed = false }: FilterPanel) => {
	return (
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">{header}</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{contentGenerator()}
				</div>
			</Slider>
		</div>
	);
};

interface FilterPanelMultiselect {
	header: string,
	nameList: [string, string][],
	colNames: string[],
	getMultiselectCtrl: ObjSpecFilterActions['getMultiselectCtrl'],
	startCollapsed?: boolean
}

const FilterPanelMultiselect = ({ header, nameList, colNames, getMultiselectCtrl, startCollapsed = false }: FilterPanelMultiselect) => {
	if (colNames.length === 0) return null;

	return (
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">{header}</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{nameList.map(name => getMultiselectCtrl(...name))}
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
		? {padding:0, margin:0, textDecoration: 'underline', cursor: 'pointer'}
		: {padding:0, margin:0, textDecoration: 'underline'};
	const onClick = () => enabled ? resetFiltersAction() : {};

	return <button className={className} style={style} onClick={onClick}>Clear categories</button>;
};

const getNameList = (specTable: OwnProps['specTable'], list: ReadonlyArray<string>): [string, string][] => {
	return list.map((colName: string) => specTable.getColLabelNamePair(colName) as [string, string]);
};

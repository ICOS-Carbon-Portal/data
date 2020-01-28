import React, {Component, Fragment} from 'react';
import config, {placeholders, filters, CategoryType} from '../config';
import Slider from './ui/Slider.jsx';
import HelpButton from './help/HelpButton.jsx';
import MultiSelectFilter from "./controls/MultiSelectFilter.jsx";
import {ReducedProps} from "../containers/Search";
import PickDates from "./filters/PickDates";
import {Value} from "../models/SpecTable";


type OwnProps = ReducedProps['objSpecFilter'] & {tabHeader: string};

export default class ObjSpecFilter extends Component<OwnProps> {

	search: {[C in CategoryType]?: any} = {}; //values are set by MultiSelectFilter

	getMultiselectCtrl(name: CategoryType){
		const {specTable, helpStorage, getResourceHelpInfo, labelLookup} = this.props;
		type StrNum = string | number

		const filterUris = specTable.getFilter(name) ?? [];
		const data = specTable
			? specTable.getDistinctAvailableColValues(name)
				.filter(Value.isDefined)
				.map(value => ({value, text: labelLookup[value] ?? value})) as {value: StrNum, text: StrNum}[]
			: [];
		const value = filterUris
			.map((val: Value) => data.some(d => d.value === val)
				? val
				: labelLookup[val!] ?? val)
			.filter(v => v !== undefined);

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
		const {specTable, filtersReset, filterTemporal} = this.props;
		const resetBtnEnabled = filterTemporal.hasFilter || specTable.hasActiveFilters;
		const availableFilters = filters[config.envri];

		return (
			<div>
				<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={filtersReset} />

				{availableFilters.map((filterPanel, i: number) =>
					<FilterPanelMultiselect
						key={"filter_" + i}
						header={filterPanel.panelTitle}
						colNames={filterPanel.filterList}
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
	colNames: ReadonlyArray<CategoryType>,
	getMultiselectCtrl: (name: CategoryType) => JSX.Element,
	startCollapsed?: boolean
}

const FilterPanelMultiselect = ({ header, colNames, getMultiselectCtrl, startCollapsed = false }: FilterPanelMultiselect) => {
	if (colNames.length === 0) return null;

	return (
		<div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">{header}</h3>
			</div>

			<Slider startCollapsed={startCollapsed}>
				<div className="panel-body" style={{paddingTop:0}}>
					{colNames.map(getMultiselectCtrl)}
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

	return <div style={{textAlign: 'right'}}><button className={className} style={style} onClick={onClick}>Clear filters</button></div>;
};

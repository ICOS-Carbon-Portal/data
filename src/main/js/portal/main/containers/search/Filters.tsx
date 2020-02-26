import React, {Component} from 'react';
import {connect} from 'react-redux';
import config, {placeholders, filters, CategoryType} from '../../config';
import Slider from '../../components/ui/Slider';
import HelpButton from '../help/HelpButton';
import MultiSelectFilter from "../../components/controls/MultiSelectFilter";
import PickDates from "../../components/filters/PickDates";
import {Value} from "../../models/SpecTable";
import {isDefined} from "../../utils";
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {ColNames} from "../../models/CompositeSpecTable";
import {filtersReset, setFilterTemporal, specFilterUpdate} from "../../actions/search";
import FiltersTemporal from "../../models/FilterTemporal";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & {tabHeader: string};
const helpButtonsToShow = ['project', 'station', 'submitter', 'type', 'level', 'format', 'quantityKind', 'valType'];

class Filters extends Component<OurProps> {

	search: {[C in CategoryType]?: any} = {}; //values are set by MultiSelectFilter

	getMultiselectCtrl(name: CategoryType){
		const {specTable, labelLookup} = this.props;
		type StrNum = string | number

		const filterUris = specTable.getFilter(name) ?? [];
		const data = specTable
			? specTable.getDistinctAvailableColValues(name)
				.filter(isDefined)
				.map(value => ({value, text: labelLookup[value] ?? value})) as {value: StrNum, text: StrNum}[]
			: [];
		const value: Value[] = filterUris
			.map((val: Value) => data.some(d => d.value === val)
				? val
				: labelLookup[val!] ?? val)
			.filter(isDefined);

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

					{helpButtonsToShow.includes(name) &&
					<HelpButton
						name={name}
						title="Click to toggle help"
					/>}

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
			<>
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
			</>
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

function stateToProps(state: State){
	return {
		filterTemporal: state.filterTemporal,
		specTable: state.specTable,
		labelLookup: state.labelLookup
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateFilter: (varName: ColNames, values: Value[]) => dispatch(specFilterUpdate(varName, values)),
		filtersReset: () => dispatch(filtersReset),
		setFilterTemporal: (filterTemporal: FiltersTemporal) => dispatch(setFilterTemporal(filterTemporal)),
	};
}

export default connect(stateToProps, dispatchToProps)(Filters);

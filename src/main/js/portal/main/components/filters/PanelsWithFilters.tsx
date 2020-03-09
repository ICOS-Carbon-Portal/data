import React from 'react';
import config, {filters, CategoryType, NumberFilterCategories} from "../../config";
import CompositeSpecTable, {ColNames} from "../../models/CompositeSpecTable";
import {IdxSig} from "../../backend/declarations";
import {Value} from "../../models/SpecTable";
import {FilterPanel} from "./FilterPanel";
import {MultiselectCtrl} from "./MultiselectCtrl";
import {debounce} from "icos-cp-utils";
import NumberFilter from "./NumberFilter";
import {FilterNumber, FilterNumbers} from "../../models/FilterNumbers";


interface PanelsWithMultiselects {
	filterNumbers: FilterNumbers
	specTable: CompositeSpecTable
	labelLookup: IdxSig
	updateFilter: (varName: ColNames, values: Value[]) => void
	setNumberFilter: (validation: FilterNumber) => void
	startCollapsed?: boolean
}

const availableFilters = filters[config.envri];

export const PanelsWithFilters: React.FunctionComponent<PanelsWithMultiselects> = props => {
	const {specTable, labelLookup, updateFilter, setNumberFilter, filterNumbers, startCollapsed = false } = props;

	return (
		<>
			{availableFilters.map((filterPanel, i: number) =>
				<Panel
					key={"i" + i}
					header={filterPanel.panelTitle}
					colNames={filterPanel.filterList}
					filterNumbers={filterNumbers}
					specTable={specTable}
					labelLookup={labelLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					startCollapsed={startCollapsed}
				/>
			)}
		</>
	);
};


interface Panel {
	header: string
	colNames: ReadonlyArray<CategoryType | NumberFilterCategories>
	specTable: CompositeSpecTable
	labelLookup: IdxSig
	filterNumbers: FilterNumbers
	updateFilter: (varName: ColNames, values: Value[]) => void
	setNumberFilter: (validation: FilterNumber) => void
	startCollapsed?: boolean
}

const Panel: React.FunctionComponent<Panel> = props => {
	const { header, colNames, specTable, labelLookup, updateFilter, setNumberFilter, filterNumbers,
		startCollapsed = false } = props;
	if (colNames.length === 0) return null;

	return (
		<FilterPanel header={header} startCollapsed={startCollapsed}>
			{colNames.map((colName, i) =>
				<FilterCtrl
					key={'i' + i}
					name={colName}
					specTable={specTable}
					filterNumbers={filterNumbers}
					labelLookup={labelLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
				/>
			)}
		</FilterPanel>
	);
};

interface FilterCtrl {
	name: CategoryType | NumberFilterCategories
	specTable: CompositeSpecTable
	labelLookup: IdxSig
	filterNumbers: FilterNumbers
	updateFilter: (varName: ColNames, values: Value[]) => void
	setNumberFilter: (validation: FilterNumber) => void
}

const FilterCtrl: React.FunctionComponent<FilterCtrl> = props => {
	const { name, specTable, labelLookup, updateFilter, setNumberFilter, filterNumbers } = props;
	const filterNumber: FilterNumber | undefined = filterNumbers.getFilter(name as NumberFilterCategories);

	if (filterNumber === undefined){
		return (
			<MultiselectCtrl
				name={name as CategoryType}
				specTable={specTable}
				labelLookup={labelLookup}
				updateFilter={updateFilter}
			/>
		);
	} else {
		return (
			<NumberFilter
				filterNumber={filterNumber}
				action={debounce((val: FilterNumber) => setNumberFilter(val), 600)}
			/>
		);
	}
};

import React from 'react';
import config, {filters, CategoryType, NumberFilterCategories, FilterName} from "../../config";
import CompositeSpecTable, {ColNames} from "../../models/CompositeSpecTable";
import {IdxSig} from "../../backend/declarations";
import {Value} from "../../models/SpecTable";
import {FilterPanel} from "./FilterPanel";
import {MultiselectCtrl} from "./MultiselectCtrl";
import {debounce} from "icos-cp-utils";
import NumberFilter from "./NumberFilter";
import {FilterNumber, FilterNumbers} from "../../models/FilterNumbers";
import FilterTemporal from "../../models/FilterTemporal";
import PickDates from "./PickDates";
import keywordsInfo, {KeywordsInfo} from "../../backend/keywordsInfo";
import {KeywordFilter} from "./KeywordFilter";


interface CommonProps {
	specTable: CompositeSpecTable
	labelLookup: IdxSig
	updateFilter: (varName: ColNames, values: Value[]) => void
	setNumberFilter: (validation: FilterNumber) => void
	filterTemporal: FilterTemporal
	setFilterTemporal: (filterTemporal: FilterTemporal) => void
}

interface PanelsWithMultiselects extends CommonProps {
	filterNumbers: FilterNumbers
	keywords: KeywordsInfo
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
	startCollapsed?: boolean
}

const availableFilters = filters[config.envri];

export const PanelsWithFilters: React.FunctionComponent<PanelsWithMultiselects> = props => {
	const {specTable, labelLookup, updateFilter, setNumberFilter, filterNumbers, startCollapsed = false,
		filterTemporal, setFilterTemporal, keywords, filterKeywords, setKeywordFilter} = props;

	return (
		<>
			{availableFilters.map((filterPanel, i: number) =>
				<Panel
					key={"i" + i}
					header={filterPanel.panelTitle}
					filterList={filterPanel.filterList}
					filterNumbers={filterNumbers}
					specTable={specTable}
					labelLookup={labelLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					keywords={keywords}
					filterKeywords={filterKeywords}
					setKeywordFilter={setKeywordFilter}
					startCollapsed={startCollapsed}
				/>
			)}
		</>
	);
};

interface Panel extends CommonProps {
	header: string
	filterList: ReadonlyArray<FilterName>
	filterNumbers: FilterNumbers
	keywords: KeywordsInfo
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
	startCollapsed?: boolean
}

const Panel: React.FunctionComponent<Panel> = props => {
	const { header, filterList, specTable, labelLookup, updateFilter, setNumberFilter, filterNumbers,
		startCollapsed = false, filterTemporal, setFilterTemporal, keywords, filterKeywords, setKeywordFilter } = props;
	if (filterList.length === 0) return null;

	return (
		<FilterPanel header={header} startCollapsed={startCollapsed}>
			{filterList.map((filterName, i) =>
				<FilterCtrl
					key={'i' + i}
					filterName={filterName}
					specTable={specTable}
					filterNumbers={filterNumbers}
					labelLookup={labelLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					keywords={keywords}
					filterKeywords={filterKeywords}
					setKeywordFilter={setKeywordFilter}
				/>
			)}
		</FilterPanel>
	);
};

interface FilterCtrl extends CommonProps {
	filterName: FilterName
	filterNumbers: FilterNumbers
	keywords: KeywordsInfo
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
}

const FilterCtrl: React.FunctionComponent<FilterCtrl> = props => {
	const { filterName, specTable, labelLookup, updateFilter, setNumberFilter, filterNumbers,
		filterTemporal, setFilterTemporal, keywords, filterKeywords, setKeywordFilter} = props;
	const filterNumber: FilterNumber | undefined = filterNumbers.getFilter(filterName as NumberFilterCategories);

	if (filterNumber !== undefined){
		return (
			<NumberFilter
				filterNumber={filterNumber}
				action={debounce((val: FilterNumber) => setNumberFilter(val), 600)}
			/>
		);
	}

	if (filterName === "temporalFilter") {
		return (
			<>
				<PickDates
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					category="dataTime"
					header="Data sampled"
				/>
				<PickDates
					marginTop={25}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					category="submission"
					header="Submission of data"
				/>
			</>
		);

	} else if (filterName === "keywordFilter") {
		return (
			<KeywordFilter
				keywords={keywords}
				filterKeywords={filterKeywords}
				setKeywordFilter={setKeywordFilter}
			/>
		);

	} else {
		return (
			<MultiselectCtrl
				name={filterName as CategoryType}
				specTable={specTable}
				labelLookup={labelLookup}
				updateFilter={updateFilter}
			/>
		);
	}
};

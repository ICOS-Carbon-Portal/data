import React from "react";
import {debounce} from "icos-cp-utils";
import config, {
	filters, type CategoryType, type NumberFilterCategories, type FilterName
} from "../../config";
import {type ColNames} from "../../models/CompositeSpecTable";
import type CompositeSpecTable from "../../models/CompositeSpecTable";
import {type Value} from "../../models/SpecTable";
import {type FilterNumber, type FilterNumbers} from "../../models/FilterNumbers";
import type FilterTemporal from "../../models/FilterTemporal";
import {type LabelLookup} from "../../models/State";
import {type HelpItem} from "../../models/HelpStorage";
import type HelpStorage from "../../models/HelpStorage";
import {isDefined} from "../../utils";
import {KeywordFilter} from "./KeywordFilter";
import PickDates from "./PickDates";
import NumberFilter from "./NumberFilter";
import {type Item, MultiselectCtrl} from "./MultiselectCtrl";
import {FilterPanel} from "./FilterPanel";

type CommonProps = {
	specTable: CompositeSpecTable
	labelLookup: LabelLookup
	countryCodesLookup: Record<string, string>
	updateFilter: (varName: ColNames | "keywordFilter", values: Value[]) => void
	setNumberFilter: (validation: FilterNumber) => void
	filterTemporal: FilterTemporal
	setFilterTemporal: (filterTemporal: FilterTemporal) => void
};

type PanelsWithMultiselects = {
	filterNumbers: FilterNumbers
	helpStorage: HelpStorage
	scopedKeywords: string[]
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
	startCollapsed?: boolean
} & CommonProps;

const availableFilters = filters[config.envri];

export const PanelsWithFilters: React.FunctionComponent<PanelsWithMultiselects> = props => {
	const {
		specTable, labelLookup, helpStorage, updateFilter, setNumberFilter, filterNumbers, startCollapsed = false,
		filterTemporal, setFilterTemporal, scopedKeywords, filterKeywords, setKeywordFilter, countryCodesLookup
	} = props;

	return (
		<>
			{availableFilters.map((filterPanel, i: number) =>
				<Panel
					key={"i" + i}
					header={filterPanel.panelTitle}
					filterList={filterPanel.filterList}
					filterNumbers={filterNumbers}
					specTable={specTable}
					helpStorage={helpStorage}
					labelLookup={labelLookup}
					countryCodesLookup={countryCodesLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					scopedKeywords={scopedKeywords}
					filterKeywords={filterKeywords}
					setKeywordFilter={setKeywordFilter}
					startCollapsed={startCollapsed}
				/>)}
		</>
	);
};

type Panel = {
	header: string
	helpStorage: HelpStorage
	filterList: readonly FilterName[]
	filterNumbers: FilterNumbers
	scopedKeywords: string[]
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
	startCollapsed?: boolean
} & CommonProps;

const Panel: React.FunctionComponent<Panel> = props => {
	const {
		header, filterList, specTable, labelLookup, helpStorage, updateFilter, setNumberFilter, filterNumbers, countryCodesLookup,
		startCollapsed = false, filterTemporal, setFilterTemporal, scopedKeywords, filterKeywords, setKeywordFilter
	} = props;
	if (filterList.length === 0) {
		return null;
	}

	return (
		<FilterPanel header={header} startCollapsed={startCollapsed}>
			{filterList.map((filterName, i) =>
				<FilterCtrl
					key={"i" + i}
					filterName={filterName}
					specTable={specTable}
					filterNumbers={filterNumbers}
					helpItem={helpStorage.getHelpItem(filterName)}
					labelLookup={labelLookup}
					countryCodesLookup={countryCodesLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					scopedKeywords={scopedKeywords}
					filterKeywords={filterKeywords}
					setKeywordFilter={setKeywordFilter}
				/>)}
		</FilterPanel>
	);
};

type FilterCtrl = {
	filterName: FilterName
	filterNumbers: FilterNumbers
	helpItem?: HelpItem
	scopedKeywords: string[]
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
} & CommonProps;

const FilterCtrl: React.FunctionComponent<FilterCtrl> = props => {
	const {
		filterName, specTable, labelLookup, helpItem, updateFilter, setNumberFilter, filterNumbers,
		filterTemporal, setFilterTemporal, scopedKeywords, filterKeywords, setKeywordFilter, countryCodesLookup
	} = props;
	const filterNumber: FilterNumber | undefined = filterNumbers.getFilter(filterName as NumberFilterCategories);

	if (filterNumber !== undefined) {
		return (
			<NumberFilter
				filterNumber={filterNumber}
				action={debounce((val: FilterNumber) => setNumberFilter(val), 600)}
			/>
		);
	}

	if (filterName === "dataTime" || filterName === "submission") {
		return (
			<>
				<PickDates
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					category={filterName}
				/>
			</>
		);
	}

	if (filterName === "keywordFilter") {
		return (
			<KeywordFilter
				scopedKeywords={scopedKeywords}
				filterKeywords={filterKeywords}
				setKeywordFilter={setKeywordFilter}
			/>
		);
	}

	const {data, value} = getDataValue(filterName, specTable, countryCodesLookup, labelLookup);

	return (
		<MultiselectCtrl
			name={filterName as CategoryType}
			data={data}
			value={value}
			helpItem={helpItem}
			updateFilter={updateFilter}
		/>
	);
};

function getDataValue(filterName: FilterName, specTable: CompositeSpecTable, countryCodesLookup: Record<string, string>, labelLookup: LabelLookup) {
	const getText = (value: string | number) => filterName === "countryCode"
		? countryCodesLookup[value]
		: labelLookup[value]?.label;

	const name = filterName as CategoryType;
	const filterUris = specTable.getFilter(name)?.filter(isDefined) ?? [];
	const dataUris = specTable.getDistinctAvailableColValues(name);
	const data: Item[] = specTable
		? makeUniqueDataText(name === "valType", specTable, dataUris
			.filter(value => isDefined(value) && !filterUris.includes(value))
			.map(value => ({
				value,
				text: getText(value!) ?? value + "",
				helpStorageListEntry: labelLookup[value!]?.list ?? []
			}))).sort((d1: any, d2: any) => d1.text.localeCompare(d2.text))
		: [];

	const value: Item[] = filterUris.map(keyVal => ({
		value: keyVal,
		text: getText(keyVal) ?? keyVal,
		helpStorageListEntry: labelLookup[keyVal]?.list ?? [],
		presentWithCurrentFilters: dataUris.includes(keyVal)
	}));

	return {data, value};
}

const makeUniqueDataText = (makeUnique: boolean, specTable: CompositeSpecTable, data: Item[]): Item[] => {
	if (!makeUnique) {
		return data;
	}

	const dataLookup = data.reduce<Record<string, number>>((acc, curr) => {
		acc[curr.text] = (acc[curr.text] ?? 0) + 1;
		return acc;
	}, {});

	return data.map(d => dataLookup[d.text] === 1
		? d
		: {
			value: d.value,
			text: `${d.text} [${specTable.columnMetaRows.find(r => r.valType === d.value)?.quantityUnit ?? "unknown unit"}]`,
			helpStorageListEntry: d.helpStorageListEntry
		});
};

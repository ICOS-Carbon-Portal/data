import React from 'react';
import config, {filters, CategoryType, NumberFilterCategories, FilterName} from "../../config";
import CompositeSpecTable, {ColNames} from "../../models/CompositeSpecTable";
import {Value} from "../../models/SpecTable";
import {FilterPanel} from "./FilterPanel";
import {Item, MultiselectCtrl} from "./MultiselectCtrl";
import {debounce} from "icos-cp-utils";
import NumberFilter from "./NumberFilter";
import {FilterNumber, FilterNumbers} from "../../models/FilterNumbers";
import FilterTemporal from "../../models/FilterTemporal";
import PickDates from "./PickDates";
import {KeywordFilter} from "./KeywordFilter";
import { LabelLookup } from '../../models/State';
import HelpStorage, {HelpItem} from "../../models/HelpStorage";
import {isDefined} from "../../utils";

interface CommonProps {
	specTable: CompositeSpecTable
	labelLookup: LabelLookup
	countryCodesLookup: Record<string, string>
	updateFilter: (varName: ColNames | 'keywordFilter', values: Value[]) => void
	setNumberFilter: (validation: FilterNumber) => void
	filterTemporal: FilterTemporal
	setFilterTemporal: (filterTemporal: FilterTemporal) => void
}

interface PanelsWithMultiselects extends CommonProps {
	filterNumbers: FilterNumbers
	helpStorage: HelpStorage
	scopedKeywords: string[]
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
	startCollapsed?: boolean
}

const availableFilters = filters[config.envri];

export const PanelsWithFilters: React.FunctionComponent<PanelsWithMultiselects> = props => {
	const {specTable, labelLookup, helpStorage, updateFilter, setNumberFilter, filterNumbers, startCollapsed = false,
		filterTemporal, setFilterTemporal, scopedKeywords, filterKeywords, setKeywordFilter, countryCodesLookup} = props;

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
				/>
			)}
		</>
	);
};

interface Panel extends CommonProps {
	header: string
	helpStorage: HelpStorage
	filterList: ReadonlyArray<FilterName>
	filterNumbers: FilterNumbers
	scopedKeywords: string[]
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
	startCollapsed?: boolean
}

const Panel: React.FunctionComponent<Panel> = props => {
	const { header, filterList, specTable, labelLookup, helpStorage, updateFilter, setNumberFilter, filterNumbers, countryCodesLookup,
		startCollapsed = false, filterTemporal, setFilterTemporal, scopedKeywords, filterKeywords, setKeywordFilter } = props;
	if (filterList.length === 0) return null;

	return (
		<FilterPanel header={header} startCollapsed={startCollapsed}>
			{filterList.map((filterName, i) =>
				<FilterCtrl
					key={'i' + i}
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
				/>
			)}
		</FilterPanel>
	);
};

interface FilterCtrl extends CommonProps {
	filterName: FilterName
	filterNumbers: FilterNumbers
	helpItem?: HelpItem
	scopedKeywords: string[]
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
}

const FilterCtrl: React.FunctionComponent<FilterCtrl> = props => {
	const { filterName, specTable, labelLookup, helpItem, updateFilter, setNumberFilter, filterNumbers,
		filterTemporal, setFilterTemporal, scopedKeywords, filterKeywords, setKeywordFilter, countryCodesLookup} = props;
	const filterNumber: FilterNumber | undefined = filterNumbers.getFilter(filterName as NumberFilterCategories);

	if (filterNumber !== undefined){
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
	} else if (filterName === "keywordFilter") {
		return (
			<KeywordFilter
				scopedKeywords={scopedKeywords}
				filterKeywords={filterKeywords}
				setKeywordFilter={setKeywordFilter}
			/>
		);

	} else {
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
	}
};

function getDataValue(filterName: FilterName, specTable: CompositeSpecTable, countryCodesLookup: Record<string,string>, labelLookup: LabelLookup){
	const getText = (value: string | number) => {
		return filterName === 'countryCode'
			? countryCodesLookup[value]
			: labelLookup[value]?.label;
	};

	const name = filterName as CategoryType;
	const filterUris = specTable.getFilter(name)?.filter(isDefined) ?? [];
	const dataUris = specTable.getDistinctAvailableColValues(name);
	const data: Item[] = specTable
		? makeUniqueDataText(name === 'valType', specTable, dataUris
			.filter(value => isDefined(value) && !filterUris.includes(value))
			.map(value => ({
				value: value,
				text: getText(value!) ?? value + '',
				helpStorageListEntry: labelLookup[value!]?.list ?? []
			}))
		).sort((d1: any, d2: any) => d1.text.localeCompare(d2.text))
		: [];

	const value: Item[] = filterUris.map(keyVal => ({
		value: keyVal,
		text: getText(keyVal) ?? keyVal,
		helpStorageListEntry: labelLookup[keyVal]?.list ?? [],
		presentWithCurrentFilters: dataUris.includes(keyVal)
	}));

	return { data, value };
};

const makeUniqueDataText = (makeUnique: boolean, specTable: CompositeSpecTable, data: Item[]): Item[] => {
	if (!makeUnique) return data;

	const dataLookup = data.reduce<Record<string, number>>((acc, curr) => {
		acc[curr.text] = (acc[curr.text] ?? 0) + 1;
		return acc;
	}, {});

	return data.map(d => {
		return dataLookup[d.text] === 1
			? d
			: {
				value: d.value,
				text: `${d.text} [${specTable.columnMetaRows.find(r => r.valType === d.value)?.quantityUnit ?? 'unknown unit'}]`,
				helpStorageListEntry: d.helpStorageListEntry
			};
	});
};

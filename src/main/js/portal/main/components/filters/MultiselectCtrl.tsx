import React from 'react';
import config, {CategoryType, placeholders} from "../../config";
import CompositeSpecTable, {ColNames} from "../../models/CompositeSpecTable";
import {isDefined} from "../../utils";
import {Value} from "../../models/SpecTable";
import HelpButton from "../../containers/help/HelpButton";
import MultiSelectFilter from "./MultiSelectFilter";
import { Obj } from '../../../../common/main/types';
import { LabelLookup } from '../../models/State';
import {HelpItem, HelpStorageListEntry} from "../../models/HelpStorage";

interface OurProps {
	name: CategoryType
	specTable: CompositeSpecTable
	helpItem?: HelpItem
	labelLookup: LabelLookup
	updateFilter: (varName: ColNames | 'keywordFilter', values: Value[]) => void
}

const search: { [C in CategoryType]?: string } = {}; //values are set by MultiSelectFilter

export type Item = {
	value: Value
	text: string
	helpStorageListEntry: HelpStorageListEntry[]
}

export const MultiselectCtrl: React.FunctionComponent<OurProps> = props => {
	const {name, specTable, labelLookup, helpItem, updateFilter} = props;

	const shouldUseExternalListEntry = helpItem?.shouldUseExternalList ?? false;
	const filterUris = specTable.getFilter(name)?.filter(isDefined) ?? [];
	const data: Item[] = specTable
		? makeUniqueDataText(name === 'valType', specTable, specTable.getDistinctAvailableColValues(name)
			.filter(value => isDefined(value) && !filterUris.includes(value))
			.map(value => ({
				value: value,
				text: labelLookup[value!]?.label ?? value + '',
				helpStorageListEntry: labelLookup[value!]?.list ?? []
			}))
		).sort((d1: any, d2: any) => d1.text.localeCompare(d2.text))
		: [];
	
	const value: Item[] = filterUris.map(filterUri => ({
		value: filterUri,
		text: labelLookup[filterUri]?.label ?? filterUri,
		helpStorageListEntry: labelLookup[filterUri]?.list ?? []
	}));

	const placeholder = data.length === 1
		? `${data[0].text}`
		: `(${data.length} items)`;

	return (
		<div className="row" key={name} style={{marginTop: 10}}>
			<div className="col-md-12">
				<label>{placeholders[config.envri][name]}</label>

				<HelpButton
					name={name}
					title="Click to toggle help"
				/>

				<MultiSelectFilter
					name={name}
					shouldUseExternalListEntry={shouldUseExternalListEntry}
					search={search}
					updateFilter={updateFilter}
					placeholder={placeholder}
					data={data}
					value={value}
				/>
			</div>
		</div>
	);
};

const makeUniqueDataText = (makeUnique: boolean, specTable: CompositeSpecTable, data: Item[]): Item[] => {
	if (!makeUnique) return data;

	const dataLookup = data.reduce<Obj<number, string>>((acc, curr) => {
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

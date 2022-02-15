import React from 'react';
import config, {CategoryType, placeholders} from "../../config";
import CompositeSpecTable, {ColNames} from "../../models/CompositeSpecTable";
import {isDefined} from "../../utils";
import {Value} from "../../models/SpecTable";
import HelpButton from "../../containers/help/HelpButton";
import MultiSelectFilter from "./MultiSelectFilter";
import { Dict } from '../../../../common/main/types';
import { LabelLookup } from '../../models/State';
import {HelpItem, HelpStorageListEntry} from "../../models/HelpStorage";

interface OurProps {
	name: CategoryType
	specTable: CompositeSpecTable
	helpItem?: HelpItem
	labelLookup: LabelLookup
	countryCodesLookup: Dict
	updateFilter: (varName: ColNames | 'keywordFilter', values: Value[]) => void
}

const search: { [C in CategoryType]?: string } = {}; //values are set by MultiSelectFilter

export type Item = {
	value: Value
	text: string
	helpStorageListEntry: HelpStorageListEntry[]
	presentWithCurrentFilters?: boolean
}

export const MultiselectCtrl: React.FunctionComponent<OurProps> = props => {
	const {name, specTable, labelLookup, countryCodesLookup, helpItem, updateFilter} = props;

	const getText = (value: string | number) => {
		return name === 'countryCode'
			? countryCodesLookup[value]
			: labelLookup[value]?.label;
	};

	const shouldUseExternalListEntry = helpItem?.shouldUseExternalList ?? false;
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

	const dataLookup = data.reduce<Dict<number, string>>((acc, curr) => {
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

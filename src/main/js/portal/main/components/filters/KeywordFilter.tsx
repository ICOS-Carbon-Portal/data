import React from "react";
import { Value } from "../../models/SpecTable";
import { isDefined } from "../../utils";
import FilterOperationBtn from "../buttons/FilterOperationBtn";
import { Item } from "./MultiselectCtrl";
import MultiSelectFilter from "./MultiSelectFilter";
import FilterToggleButton from "../buttons/FilterToggleButton";


interface OurProps {
	scopedKeywords: string[]
	filterKeywords: string[]
	filterKeywordsOperator: "AND" | "OR"
	setKeywordFilter: (filterKeywords: string[], filterKeywordsOperator?: "AND" | "OR") => void
}

export const KeywordFilter: React.FunctionComponent<OurProps> = props => {
	const {scopedKeywords, filterKeywords, setKeywordFilter, filterKeywordsOperator} = props;

	const value: Item[] = filterKeywords.map(kw => ({text: kw, value: kw, helpStorageListEntry: []}));
	const data: Item[] = scopedKeywords
		.map(txt => ({text: txt, value: txt, helpStorageListEntry: []}))
		.filter(item => !value.some(v => v.value == item.value));
	const placeholder = data.length === 1
		? `${data[0].text}`
		: `(${data.length} items)`;
	
	return (
		<>
			<div className="row" style={{marginTop: 10}}>
				<div className="col d-flex justify-content-between">
					<div>
						<label>Keyword</label>
					</div>

					<div>
						<FilterToggleButton
							enabled={value.length > 0}
							options={
								[{text: "ALL", selected: filterKeywordsOperator === "AND"},
								{text: "ANY", selected: filterKeywordsOperator === "OR"}]
							}
							filterName="keywordFilter"
							title="Reset this filter"
							baseStyle={{fontSize: 16, marginLeft: 12}}
							toggle={() => setKeywordFilter(filterKeywords, filterKeywordsOperator === "AND" ? "OR" : "AND")}
						/>
						<FilterOperationBtn
							enabled={value.length > 0}
							filterName="keywordFilter"
							title="Reset this filter"
							baseStyle={{fontSize: 16, marginLeft: 12}}
							iconCls="fas fa-times-circle"
							action={() => setKeywordFilter([])}
						/>
					</div>
				</div>
			</div>
			<div className="row">
				<div className="col-md-12">
					<MultiSelectFilter
						name={"keywordFilter"}
						shouldUseExternalListEntry={false}
						search={{}}
						updateFilter={(_: any, keywords: Value[]) => setKeywordFilter(keywords.filter(isDefined).map(kw => kw + ''))}
						placeholder={placeholder}
						data={data}
						value={value}
					/>
				</div>
			</div>
		</>
	);
};

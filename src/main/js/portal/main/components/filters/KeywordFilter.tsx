import React from "react";
import keywordsInfo, {KeywordsInfo} from "../../backend/keywordsInfo";
import { Value } from "../../models/SpecTable";
import { isDefined } from "../../utils";
import FilterOperationBtn from "../buttons/FilterOperationBtn";
import { Item } from "./MultiselectCtrl";
import MultiSelectFilter from "./MultiSelectFilter";


interface OurProps {
	keywords: KeywordsInfo
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
}

export const KeywordFilter: React.FunctionComponent<OurProps> = props => {
	const {keywords, filterKeywords, setKeywordFilter} = props;

	const value: Item[] = filterKeywords.map(kw => ({text: kw, value: kw, helpStorageListEntry: []}));
	const data: Item[] = keywords.filteredKeywords
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

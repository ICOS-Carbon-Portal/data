import React, {ChangeEvent, useEffect, useMemo, useState} from "react";
import { AdvancedFilter } from "../../models/State";

interface OurProps {
	filterAdvancedText: string
	filterAdvancedType: AdvancedFilter
	updateAdvanced: (text: string, filter: AdvancedFilter) => void
}

type ValidationResults = {
	message: string
	validityClass: string
}

export default function FilterAdvanced(props: OurProps) {
	const [filterText, setFilterText] = useState<string>(props.filterAdvancedText);
	const [filterType, setFilterType] = useState<AdvancedFilter>(props.filterAdvancedType);

	// Non-specific pid-regexp to capture PID alone or PID suffix of any URL
	const pidRegexp = /(?:.*\/|^)([a-zA-Z0-9\-_]{24})$/;

	function extractFilterText(): string {
		if (filterType === "dobj" || filterType === "collection") {
			const pidMatch = filterText.match(pidRegexp);
			return pidMatch ? pidMatch[1] : "";
		}
		return filterText;
	}

	const extractedFilterText = useMemo(extractFilterText, [filterText, filterType]);

	useEffect(() => {
		props.updateAdvanced(extractedFilterText, filterType);
	}, [extractedFilterText, filterType]);

	function validateFilterText(): ValidationResults {
		if (filterType === "dobj" || filterType === "collection") {
			if (filterText.length === 0) {
				return {message: "", validityClass: ""};
			}
			if (extractedFilterText) {
				return {message: "", validityClass: " is-valid"};
			}
			return {message: "Not a valid PID", validityClass: " is-invalid"};
		}
		return {message: "", validityClass: ""};
	}

	const {message, validityClass} = validateFilterText();

	function handleTextChange(ev: ChangeEvent<HTMLInputElement>) {
		setFilterText(ev.target.value);
	}

	function handleFilterTypeChange(ev: ChangeEvent<HTMLInputElement>) {
		setFilterType(ev.target.value as AdvancedFilter);
	}

	function getPlaceholder() {
		switch(filterType) {
			case "dobj":
				return "Enter data object PID here";
			case "collection":
				return "Enter collection PID here"
			case "filename":
				return "Enter file name here"
			default:
				return "";
		}
	}

	return (
		<div className="row" style={{marginTop: 10}}>
			<div className="col-md-12">
				<div className="form-check">
					<input
						type="radio"
						name="advancedFilterType"
						id="advancedFilterDobj"
						value="dobj"
						checked={filterType === "dobj"}
						onChange={handleFilterTypeChange}
						className="form-check-input"
					/>
					<label className="form-check-label" htmlFor="advancedFilterDobj">Data object PID</label>
				</div>
				<div className="form-check">
					<input
						type="radio"
						name="advancedFilterType"
						id="advancedFilterCollection"
						value="collection"
						checked={filterType === "collection"}
						onChange={handleFilterTypeChange}
						className="form-check-input"
					/>
					<label className="form-check-label" htmlFor="advancedFilterCollection">Collection PID</label>
				</div>
				<div className="form-check">
					<input
						type="radio"
						name="advancedFilterType"
						id="advancedFilterFilename"
						value="filename"
						checked={filterType === "filename"}
						onChange={handleFilterTypeChange}
						className="form-check-input"
					/>
					<label className="form-check-label" htmlFor="advancedFilterFilename">File name</label>
				</div>
				<input
					type="text"
					className={"form-control" + validityClass}
					title={message}
					placeholder={getPlaceholder()}
					onChange={handleTextChange}
					value={filterText}
				/>
				<div className="fs-xs">All text filters find exact matches only</div>
			</div>
		</div>
	);
}

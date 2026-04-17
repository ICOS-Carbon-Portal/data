import React, {ChangeEvent, useEffect, useRef, useState} from "react";
import HelpButton from "../../containers/help/HelpButton";
import { pidRegexp } from "../../utils";
import { AdvancedFilter } from "../../models/State";

interface OurProps {
	filterAdvancedText: string
	filterAdvancedType: AdvancedFilter
	updateAdvanced: (text: string, filter: AdvancedFilter) => void
	showDeprecated: boolean
}

type ValidationResults = {
	message: string
	validityClass: string
}

export default function FilterAdvanced(props: OurProps) {

	const [filterText, setFilterText] = useState<string>(props.filterAdvancedText);
	const [filterType, setFilterType] = useState<AdvancedFilter>(props.filterAdvancedType);
	const [wasValid, setWasValid] = useState<boolean>(false);

	useEffect(() => {
		if (filterText.length === 0) {
			if (wasValid) {
				setWasValid(false);
				props.updateAdvanced("", filterType);
			}
		} else if (filterType === "dobj" || filterType === "collection") {
			const pidMatch = filterText.match(pidRegexp);
			if (pidMatch) {
				props.updateAdvanced(pidMatch[1], filterType);
				setWasValid(true);
			} else {
				if (wasValid) {
					setWasValid(false);
					props.updateAdvanced("", filterType);
				}
			}
		} else if (filterType === "filename") {
			props.updateAdvanced(filterText, filterType);
		}
	}, [filterText, filterType]);

	function validateFilterText(): ValidationResults {
		if (filterType === "dobj" || filterType === "collection") {
			if (filterText.length === 0) {
				return {message: "", validityClass: ""};
			}
			const pidMatch = filterText.match(pidRegexp);

			if (pidMatch) {
				return {message: "", validityClass: " is-valid"};
			} else {
				return {message: "Not a valid PID", validityClass: " is-invalid"};
			}
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
				<div className="mb-1"><em>Note: all text filters match <strong>exact text only</strong></em></div>
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
					<label className="form-check-label" htmlFor="advancedFilterDobj">Data object PID</label><HelpButton name="pidFilter" />
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
					<label className="form-check-label" htmlFor="advancedFilterCollection">Collection PID</label><HelpButton name="collectionFilter" />
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
					<label className="form-check-label" htmlFor="advancedFilterFilename">File name</label><HelpButton name="filenameFilter" />
				</div>
				<input
					type="text"
					className={"form-control" + validityClass}
					title={message}
					placeholder={getPlaceholder()}
					onChange={handleTextChange}
					defaultValue={props.filterAdvancedText}
				/>
			</div>
		</div>
	);
}

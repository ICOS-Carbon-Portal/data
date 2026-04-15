import React, {ChangeEvent, useEffect, useState} from "react";
import HelpButton from "../../containers/help/HelpButton";
import { pidRegexp } from "../../utils";

interface OurProps {
	filterCollection: string
	updateCollection: (collection: string) => void
	showDeprecated: Boolean
}

export default function FilterByCollection(props: OurProps) {

	const [message, setMessage] = useState<string>("");
	const [validityClass, setValidityClass] = useState<string>("");

	useEffect(() => updateFilter(props.filterCollection), [])

	function handleSearch(ev: ChangeEvent<HTMLInputElement>) {
		updateFilter(ev.target.value);		
	}

	function updateFilter(collection: string) {
		if (collection.length === 0) {
			if (validityClass.length > 0) {
				props.updateCollection("");
			}
			setMessage("");
			setValidityClass("");
			return;
		}

		const pidMatch = collection.match(pidRegexp);
		if (pidMatch) {
			props.updateCollection(pidMatch[1]);
			setMessage("");
			setValidityClass(" is-valid");
		} else {
			props.updateCollection("");
			setMessage("Not a valid collection PID");
			setValidityClass(" is-invalid");
		}
	}

	return (
		<div className="row" style={{marginTop: 10}}>
			<div className="col-md-12">
				<label style={{marginBottom: 0}}>Collection PID (exact match)</label>
				<HelpButton name="collectionFilter" />
				<input
					type="text"
					className={"form-control" + validityClass}
					title={message}
					placeholder="Paste a collection PID suffix"
					onChange={handleSearch}
					defaultValue={props.filterCollection}
				/>
			</div>
		</div>
	);
}

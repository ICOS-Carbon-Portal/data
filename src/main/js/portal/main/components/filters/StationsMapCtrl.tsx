import React from 'react';
import HelpButton from "../../containers/help/HelpButton";


interface OurProps {
	openStationsMap: () => void
}

export const StationsMapCtrl: React.FunctionComponent<OurProps> = props => {
	const {openStationsMap} = props;

	return (
		<>
			<div className="row" style={{marginTop: 10}}>
				<div className="col">
					<label>Stations map</label>

					<HelpButton name="stationsMap" />
				</div>
			</div>
			<div className="row">
				<div className="col-md-12">
					<button className="btn btn-light border px-4" type="button" onClick={openStationsMap}>
						Open map
					</button>
				</div>
			</div>
		</>
	);
};

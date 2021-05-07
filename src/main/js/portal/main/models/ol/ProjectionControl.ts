import Control, { Options } from 'ol/control/Control';
import { Obj } from '../../../../common/main/types';

export interface ProjectionControlOptions extends Options {
	supportedSRIDs: Obj<string>
	selectedSRID: string
	switchProjAction: (newSRID: string) => void
}

export class ProjectionControl extends Control {
	constructor(options: ProjectionControlOptions) {
		super(options);

		Control.call(this, {
			element: options.element,
			target: options.target
		});

		const { supportedSRIDs, selectedSRID, switchProjAction } = options;
		const select = document.createElement('select');

		Object.keys(supportedSRIDs).forEach(srid => {
			const option = document.createElement('option');
			option.value = srid;
			option.text = supportedSRIDs[srid];
			option.selected = srid === selectedSRID;
			select.appendChild(option);
		});

		select.onchange = (ev => {
			switchProjAction((ev.target as HTMLSelectElement).value);
		});

		this.element.appendChild(select);
	}
}
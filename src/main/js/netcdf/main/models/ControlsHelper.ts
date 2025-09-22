import { control } from "leaflet";
import { getRasterId, RasterRequest, VariableInfo } from "../backend";
import { Colormap } from "./Colormap";

export type Control<T> = {
	values: T[]
	selectedIdx: number | null
};

export function getSelectedControl<T>(control: Control<T>): T | null {
	return control.selectedIdx !== null && control.selectedIdx >= 0 && control.selectedIdx < control.values.length
		? control.values[control.selectedIdx]
		: null;
}

export function colormapControlWithGamma(control: Control<Colormap>, newGamma: number): Control<Colormap> {
	return {
		values: control.values.map(cm => {return {...cm, gamma: newGamma}}),
		selectedIdx: control.selectedIdx
	}
}

export function emptyControl(): Control<any> {
	return {values: [], selectedIdx: null};
}

export type ControlsHelper = {
	services: Control<string>
	variables: Control<VariableInfo>
	dates: Control<string>
	extraDim: Control<string>
	gammas: Control<number>
	delays: Control<number>
	colorMaps: Control<Colormap>
};

export function getRasterRequest(controlsHelper: ControlsHelper): RasterRequest | undefined {
	const service = getSelectedControl(controlsHelper.services);
	const variable = getSelectedControl(controlsHelper.variables);
	const dateIdx = controlsHelper.dates.selectedIdx;
	const extraDimIdx = controlsHelper.extraDim.selectedIdx;

	return (
		service === null || variable === null || dateIdx === null || dateIdx < 0 ||
		(variable.extra !== undefined && extraDimIdx === null)
	) ? undefined
		: {service, variable: variable.shortName, dateIdx, extraDimIdx};
}

export function getRasterRequestId(controlsHelper: ControlsHelper): string | undefined {
	const req = getRasterRequest(controlsHelper);
	return req ? getRasterId(req) : undefined;
}

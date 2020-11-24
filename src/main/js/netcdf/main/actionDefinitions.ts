import { Action } from "redux";
import * as GeoJSON from "geojson";
import { DataObject } from "../../common/main/metacore";
import { RangeFilter, TimeserieParams } from "./models/State";
import { ControlsHelper } from "./models/ControlsHelper";
import { BinRasterExtended } from "./models/BinRasterExtended";

export abstract class ActionPayload { }
export interface NetCDFPlainAction extends Action<string> {
	payload: ActionPayload
}

export class ERROR extends ActionPayload {
	constructor(readonly error: Error) { super(); }
}
export class METADATA_FETCHED extends ActionPayload {
	constructor(readonly metadata: DataObject) { super(); }
}
export class COUNTRIES_FETCHED extends ActionPayload {
	constructor(readonly countriesTopo: GeoJSON.Feature<GeoJSON.Point, GeoJSON.GeoJsonProperties>) { super(); }
}
export class SERVICES_FETCHED extends ActionPayload {
	constructor(readonly services: string) { super(); }
}
export class SERVICE_SET extends ActionPayload {
	constructor(readonly services: string[]) { super(); }
}
export class SERVICE_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class TITLE_FETCHED extends ActionPayload {
	constructor(readonly title: string) { super(); }
}
export class VARIABLES_AND_DATES_FETCHED extends ActionPayload {
	constructor(readonly service: string, readonly variables: string[], readonly dates: string[]) { super(); }
}
export class ELEVATIONS_FETCHED extends ActionPayload {
	constructor(readonly controlName: string, readonly elevations: string[], readonly controls: ControlsHelper) { super(); }
}
export class VARIABLE_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class DATE_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class ELEVATION_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class DELAY_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class SET_RANGEFILTER extends ActionPayload {
	constructor(readonly rangeFilter: RangeFilter) { super(); }
}
export class RASTER_FETCHED extends ActionPayload {
	constructor(readonly raster: BinRasterExtended, readonly controls: ControlsHelper) { super(); }
}
export class GAMMA_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class COLORRAMP_SELECTED extends ActionPayload {
	constructor(readonly idx: number) { super(); }
}
export class FETCHING_TIMESERIE extends ActionPayload {}
export class TIMESERIE_FETCHED extends ActionPayload {
	constructor(readonly yValues: number[], readonly timeserieParams: TimeserieParams) { super(); }
}
export class TIMESERIE_RESET extends ActionPayload { }
export class TOGGLE_TS_SPINNER extends ActionPayload {
	constructor(readonly showTSSpinner: boolean) { super(); }
}
export class PUSH_PLAY extends ActionPayload { }
export class INCREMENT_RASTER extends ActionPayload {
	constructor(readonly increment: number) { super(); }
}

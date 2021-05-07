import Projection from "ol/proj/Projection";
import { defaultBaseMaps, BasemapOptions, TileLayerExtended } from "./baseMaps";
import { EpsgCode, getViewParams } from "./projections";
import Zoom from 'ol/control/Zoom';
import ZoomSlider from 'ol/control/ZoomSlider';
import ScaleLine from 'ol/control/ScaleLine';
import ZoomToExtent from 'ol/control/ZoomToExtent';
import Control from "ol/control/Control";

export type BaseMapFilter = (bm: BasemapOptions) => boolean

export const getBaseMapLayers = (selectedBaseMap: string, layerFilter: BaseMapFilter) => {
	const getNewTileLayer = ({ name, isWorldWide, source, esriServiceName }: BasemapOptions) => {
		return new TileLayerExtended({
			visible: selectedBaseMap === name,
			name,
			isWorldWide,
			esriServiceName,
			layerType: 'baseMap',
			source
		});
	};

	return defaultBaseMaps
		.filter(layerFilter)
		.map(bm => getNewTileLayer(bm));
}

export const getDefaultControls = (projection: Projection, controlFilter: (ctrl: Control) => boolean = (ctrl: Control) => true) => {
	return [
		new Zoom(),
		new ZoomSlider(),
		new ScaleLine(),
		new ZoomToExtent({ extent: getViewParams(projection.getCode() as EpsgCode).extent }),
	].filter(controlFilter);
};

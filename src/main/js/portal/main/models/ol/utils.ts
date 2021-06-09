import Projection from "ol/proj/Projection";
import { defaultBaseMaps, BasemapOptions, TileLayerExtended } from "./baseMaps";
import { EpsgCode, getViewParams } from "./projections";
import Zoom from 'ol/control/Zoom';
import ZoomSlider from 'ol/control/ZoomSlider';
import ScaleLine from 'ol/control/ScaleLine';
import ZoomToExtent from 'ol/control/ZoomToExtent';
import Control from "ol/control/Control";
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON, { GeoJSONFeatureCollection } from 'ol/format/GeoJSON';
import { Extent } from 'ol/extent';
import Geometry from 'ol/geom/Geometry';
import Feature from 'ol/Feature';
import { LayerWrapper, PointData } from "./OLWrapper";
import Point from "ol/geom/Point";
import GeometryLayout from "ol/geom/GeometryLayout";
import Style from "ol/style/Style";
import { Options } from "ol/layer/BaseVector";
import Map from 'ol/Map';
import BaseLayer from "ol/layer/Base";
import CircleStyle from "ol/style/Circle";

export type BaseMapFilter = (bm: BasemapOptions) => boolean

export const getBaseMapLayers = (selectedBaseMap: string, layerFilter: BaseMapFilter = _ => true) => {
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
};

export const getDefaultControls = (projection: Projection, controlFilter: (ctrl: Control) => boolean = (ctrl: Control) => true) => {
	return [
		new Zoom(),
		new ZoomSlider(),
		new ScaleLine(),
		new ZoomToExtent({ extent: getViewParams(projection.getCode() as EpsgCode).extent }),
	].filter(controlFilter);
};

export function geoJsonToFeatures(geoJsonData: GeoJSONFeatureCollection, epsgCodeForData: EpsgCode, projection: Projection): Feature<Geometry>[] {
	return (new GeoJSON()).readFeatures(geoJsonData, {
		dataProjection: epsgCodeForData,
		featureProjection: projection
	});
}

export function geoJsonToLayer(layer: LayerWrapper, epsgCodeForData: EpsgCode, projection: Projection, extent: Extent): VectorLayerExtended {
	const source = new VectorSource({
		features: geoJsonToFeatures(layer.data as GeoJSONFeatureCollection, epsgCodeForData, projection)
	});

	return sourceToLayer(source, layer, extent);
}

export function pointsToFeatures(points: PointData[]): Feature<Geometry>[] {
	return points.map(p => new Feature({
		...p.attributes,
		geometry: new Point(p.coord, GeometryLayout.XY)
	}));
}

export function pointsToLayer(layer: LayerWrapper, extent: Extent): VectorLayerExtended {
	const source = new VectorSource({
		features: pointsToFeatures(layer.data as PointData[])
	});

	return sourceToLayer(source, layer, extent);
}

function sourceToLayer(source: VectorSource, layer: LayerWrapper, extent: Extent): VectorLayerExtended {
	const vectorLayer = new VectorLayerExtended({
		id: layer.id,
		name: layer.name,
		extent: extent,
		source,
		visible: layer.visible,
		layerType: layer.layerType,
		...layer.options,
		style: layer.style
	});
	vectorLayer.setProperties(layer.layerProps);

	return vectorLayer;
}

export interface VectorLayerOptions extends Options {
	id?: string
	name?: string
	layerType: 'baseMap' | 'toggle'
}
export class VectorLayerExtended extends VectorLayer {
	constructor(props: VectorLayerOptions) {
		super(props);
	}
}

export function findLayer(map: Map, layerId: string) {
	return map.getLayers().getArray().find(l => l.get('id') === layerId);
}

export function getLayerVisibility(map: Map, layerId: string, defaultVal: boolean = true) {
	return findLayer(map, layerId)?.get('visible') ?? defaultVal
}

export function findLayers(map: Map, layerFilter: (layer: BaseLayer) => boolean) {
	return map.getLayers().getArray().filter(layerFilter);
}

export function getLayerIcon(layer: VectorLayer) {
	const style = (layer.getStyle ? layer.getStyle() : undefined) as Style | undefined;
	const circleStyle = (style && style.getImage ? style.getImage() : undefined) as CircleStyle;

	return circleStyle && circleStyle.getImage ? circleStyle.getImage(1) : undefined;
}

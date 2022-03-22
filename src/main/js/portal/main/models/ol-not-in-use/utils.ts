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
import GeometryGeom from 'ol/geom/Geometry';
import {Geometry} from "geojson";
import Feature from 'ol/Feature';
import { LayerWrapper, PointData } from "./OLWrapper";
import Point from "ol/geom/Point";
import GeometryLayout from "ol/geom/GeometryLayout";
import Style from "ol/style/Style";
import { Options } from "ol/layer/BaseVector";
import Map from 'ol/Map';
import BaseLayer from "ol/layer/Base";
import CircleStyle from "ol/style/Circle";
import {Coordinate} from "ol/coordinate";
import bboxClip from "@turf/bbox-clip";
import {polygon} from "@turf/helpers";
import {ParsedSparqlValue, ReducedStation} from "icos-cp-backend";

export type Dict<Value = string, Keys extends string | number | symbol = string> = Record<Keys, Value>
export type BaseMapFilter = (bm: BasemapOptions) => boolean

export type LayerWrapperArgs = Pick<LayerWrapper, 'id' | 'layerType' | 'geoType' | 'label' | 'style' | 'data'>
	& { visible: boolean, zIndex: number, interactive: boolean }

export const getBaseMapLayers = (selectedBaseMap: string, layerFilter: BaseMapFilter = _ => true) => {
	const getNewTileLayer = ({ id, label, isEsri, isWorldWide, source, esriServiceName }: BasemapOptions) => {
		return new TileLayerExtended({
			visible: selectedBaseMap === id,
			isEsri,
			id,
			label,
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

export function geoJsonToFeatures(geoJsonData: GeoJSONFeatureCollection, epsgCodeForData: EpsgCode, projection: Projection): Feature<GeometryGeom>[] {
	return (new GeoJSON()).readFeatures(geoJsonData, {
		dataProjection: epsgCodeForData,
		featureProjection: projection
	});
}

export function geoJsonToLayer(layer: LayerWrapper, epsgCodeForData: EpsgCode, projection: Projection, extent: Extent): VectorLayerExtended {
	const source = new VectorSource({
		features: geoJsonToFeatures(layer.data as GeoJSONFeatureCollection, epsgCodeForData, projection)
	});

	return sourceToLayer("geojson", source, layer, extent);
}

export function pointsToFeatures(points: PointData[]): Feature<GeometryGeom>[] {
	return points.map(p => new Feature({
		...p.attributes,
		geometry: new Point(p.coord, GeometryLayout.XY)
	}));
}

export function pointsToLayer(layer: LayerWrapper, extent: Extent): VectorLayerExtended {
	const source = new VectorSource({
		features: pointsToFeatures(layer.data as PointData[])
	});

	return sourceToLayer("point", source, layer, extent);
}

function sourceToLayer(geoType: LayerWrapperArgs['geoType'], source: VectorSource, layer: LayerWrapper, extent: Extent): VectorLayerExtended {
	const vectorLayer = new VectorLayerExtended({
		id: layer.id,
		geoType,
		label: layer.label,
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

export function getLayerWrapper({id, label, layerType, visible, geoType, data, style, zIndex, interactive}: LayerWrapperArgs): LayerWrapper {
	return {
		id,
		layerType,
		geoType,
		label,
		layerProps: { id },
		visible,
		data,
		style,
		options: { zIndex, interactive }
	};
}

export interface VectorLayerOptions extends Options {
	id?: string
	label?: string
	layerType: 'baseMap' | 'toggle'
	geoType: LayerWrapperArgs['geoType']
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

export function isPointInRectangle(rectangles: Coordinate[][], point: Coordinate) {
	return rectangles.some(rect =>
		point[0] >= rect[0][0] && point[0] <= rect[2][0] &&	// x
		point[1] >= rect[0][1] && point[1] <= rect[2][1]	// y
	);
}

export const createPointData = (station: ReducedStation): PointData => {
	return {
		coord: station.point as number[],
		attributes: getProps(station)
	};
};

export type SimpleGeometryJson = {
	type: 'LineString' | 'Polygon'
	coordinates: number[][]
}
export type GeometryCollectionJson = {
	type: 'GeometryCollection'
	geometries: SimpleGeometryJson[]
}
export const clipToBbox = (layer: ReducedStation) => {
	const geoJson = layer.geoJson as unknown as GeometryCollectionJson | SimpleGeometryJson;

	if (geoJson.type === "GeometryCollection") {
		const originalCoords = geoJson.geometries.map(geom => geom.coordinates);
		const clippedGeometries = originalCoords
			.map((coords: any) => bboxClip(polygon(coords), [-180, 0, 180, 90]))
			.map((f: any) => f.geometry);
		geoJson.geometries = clippedGeometries;
	}

	return layer;
};

export function getFeatureCollection(stations: ReducedStation[]): GeoJSONFeatureCollection {
	return {
		type: "FeatureCollection",
		features: stations.map(station => ({
			id: station.id as string,
			type: "Feature",
			geometry: station.geoJson as unknown as Geometry,
			properties: getProps(station)
		}))
	};
}

function getProps(station: ReducedStation){
	return Object.keys(station).reduce<Dict<ParsedSparqlValue | boolean>>((acc, key) => {
		const prop = key === 'geoJson'
			? undefined
			: station[key as keyof ReducedStation];

		if (prop !== undefined && !Array.isArray(prop)){
			acc[key] = prop;
		}
		return acc;
	}, {});
}

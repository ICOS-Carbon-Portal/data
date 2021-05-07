import TileLayer from "ol/layer/Tile";
import { Options } from "ol/layer/BaseTile";
import OSM, { ATTRIBUTION } from "ol/source/OSM";
import Stamen from "ol/source/Stamen";
import TileArcGISRest from 'ol/source/TileArcGISRest';
import XYZ from 'ol/source/XYZ';


export type BaseMapName = 'OpenStreetMap' | 'Watercolor' | 'Imagery' | 'Topography' | 'Ocean' | 'Physical' | 'Shaded relief' | 'LM Topo' | 'LM Topo gray'
export interface BasemapOptions extends Options {
	name: string
	isWorldWide: boolean
	visibility?: boolean
	defaultVisibility?: boolean
	esriServiceName?: string
	layerType?: 'baseMap' | 'toggle'
}

export class TileLayerExtended extends TileLayer {
	constructor(props: BasemapOptions) {
		super(props);
	}
}

const openLMApiKey = '70fed030-6e85-364e-9567-6e5579ef60bd';

export const defaultBaseMaps: BasemapOptions[] = [
	{
		name: 'OpenStreetMap',
		isWorldWide: true,
		source: new OSM({
			attributions: ATTRIBUTION,
			crossOrigin: 'anonymous'
		})
	},
	{
		name: 'Watercolor',
		isWorldWide: true,
		source: new Stamen({
			layer: 'watercolor'
		})
	},
	{
		name: 'Imagery',
		isWorldWide: true,
		esriServiceName: 'World_Imagery',
		source: new TileArcGISRest({
			url: '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer',
			crossOrigin: 'anonymous'
		})
	},
	{
		name: 'Topography',
		isWorldWide: true,
		esriServiceName: 'World_Topo_Map',
		source: new TileArcGISRest({
			url: '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer',
			attributions: 'Fetching from server...',
			crossOrigin: 'anonymous'
		})
	},
	{
		name: 'Ocean',
		isWorldWide: true,
		esriServiceName: 'Ocean_Basemap',
		source: new TileArcGISRest({
			url: '//server.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer',
			crossOrigin: 'anonymous'
		})
	},
	{
		name: 'Physical',
		isWorldWide: true,
		source: new TileArcGISRest({
			url: '//server.arcgisonline.com/arcgis/rest/services/World_Physical_Map/MapServer',
			attributions: "Source: US National Park Service",
			crossOrigin: 'anonymous'
		})
	},
	{
		name: 'Shaded relief',
		isWorldWide: true,
		source: new TileArcGISRest({
			url: '//server.arcgisonline.com/arcgis/rest/services/World_Shaded_Relief/MapServer',
			attributions: "Copyright:(c) 2014 Esri",
			crossOrigin: 'anonymous'
		})
	},
	{
		name: 'LM Topo',
		isWorldWide: false,
		source: new XYZ({
			url: `//api.lantmateriet.se/open/topowebb-ccby/v1/wmts/token/${openLMApiKey}/1.0.0/topowebb/default/3857/{z}/{y}/{x}.png`
		})
	},
	{
		name: 'LM Topo gray',
		isWorldWide: false,
		source: new XYZ({
			url: `//api.lantmateriet.se/open/topowebb-ccby/v1/wmts/token/${openLMApiKey}/1.0.0/topowebb_nedtonad/default/3857/{z}/{y}/{x}.png`
		})
	}
];

export const esriBaseMapNames = defaultBaseMaps.filter(bm => bm.esriServiceName).map(bm => bm.esriServiceName);
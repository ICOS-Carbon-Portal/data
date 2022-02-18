import OLWrapper, { MapOptions, PersistedMapProps, PointData, LayerWrapper } from './ol/OLWrapper';
import { getBaseMapLayers, getDefaultControls, getLayerIcon, getLayerVisibility } from "./ol/utils";
import { EpsgCode, getProjection, getTransformPointFn, SupportedSRIDs } from './ol/projections';
import Select from 'ol/interaction/Select';
import * as condition from 'ol/events/condition';
import { Collection, Feature } from 'ol';
import {MapProps, State, StationPos4326Lookup} from './State';
import Popup from './ol/Popup';
import { LayerControl } from './ol/LayerControl';
import Copyright, { getESRICopyRight } from './ol/Copyright';
import { Dict } from '../../../common/main/types';
import CompositeSpecTable from './CompositeSpecTable';
import { UrlStr } from '../backend/declarations';
import {difference} from '../utils';
import {Filter, Value} from './SpecTable';
import config from '../config';
import { Coordinate } from 'ol/coordinate';
import { ProjectionControl } from './ol/ProjectionControl';
import { BaseMapName, esriBaseMapNames } from './ol/baseMaps';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import { CountriesTopo, getCountriesGeoJson } from '../backend';
import olStyles from './ol/styles';
import { DrawFeature, StateStationUris, StationFilterControl } from './StationFilterControl';


type LayerWrapperArgs = Pick<LayerWrapper, 'id' | 'layerType' | 'geoType' | 'name' | 'style' | 'data'> & { zIndex: number, interactive: boolean }
export type UpdateMapSelectedSRID = (srid: SupportedSRIDs) => void
export type TransformPointFn = (lon: number, lat: number) => number[]
interface MapOptionsExpanded extends Partial<MapOptions> {
	center?: Coordinate
	hitTolerance: number
}
export interface PersistedMapPropsExtended<BMN = BaseMapName> extends PersistedMapProps<BMN> {
	drawFeatures?: DrawFeature[]
	isStationFilterCtrlActive?: boolean
	stateStationUris?: StateStationUris
}
interface Props extends UpdateProps {
	mapRootelement: HTMLElement
	persistedMapProps: PersistedMapPropsExtended
	updatePersistedMapProps: (persistedMapProps: PersistedMapPropsExtended) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
	updateStationFilterInState: (stationUrisToState: Filter) => void
}
interface UpdateProps {
	specTable: CompositeSpecTable
	// allStationUris: Value[]
	stationPos4326Lookup: StationPos4326Lookup[]
	labelLookup: State['labelLookup']
	spatialStationsFilter: Filter
	mapProps: MapProps
}
export type StationPosLookup = Dict<{ coord: number[], stationLbl: string }, UrlStr>

const countryBordersId = 'countryBorders';
const olMapSettings = config.olMapSettings;
const isIncludedStation = 'isIncluded';

export default class InitMap {
	private olwrapper: OLWrapper;
	private appEPSGCode: EpsgCode;
	private mapOptions: MapOptionsExpanded;
	private popup: Popup;
	private readonly layerControl: LayerControl;
	private readonly stationFilterControl: StationFilterControl;
	private pointTransformer: TransformPointFn;
	private stationPos4326Lookup: StationPos4326Lookup[];
	private allStationUris: Value[];
	private countriesTopo?: CountriesTopo;
	private persistedMapProps: PersistedMapPropsExtended<BaseMapName | 'Countries'>;
	private updatePersistedMapProps: (persistedMapProps: PersistedMapPropsExtended) => void;
	private updateStationFilterInState: (stationUrisToState: Filter) => void;

	constructor(props: Props) {
		const {
			mapRootelement,
			// stationPos4326Lookup,
			updateMapSelectedSRID,
			persistedMapProps,
			updatePersistedMapProps,
			updateStationFilterInState
		} = props;

		this.persistedMapProps = persistedMapProps;
		this.fetchCountriesTopo();

		this.stationPos4326Lookup = [];
		this.allStationUris = [];
		// this.stationPos4326Lookup = stationPos4326Lookup;
		// this.allStationUris = stationPos4326Lookup.map(s => s.station);
		this.updatePersistedMapProps = updatePersistedMapProps;
		this.updateStationFilterInState = updateStationFilterInState;

		this.appEPSGCode = persistedMapProps.srid === undefined
			? `EPSG:${olMapSettings.defaultSRID}` as EpsgCode
			: `EPSG:${persistedMapProps.srid}` as EpsgCode;
		const projection = getProjection(this.appEPSGCode);
		this.pointTransformer = getTransformPointFn("EPSG:4326", this.appEPSGCode);

		this.mapOptions = {
			center: persistedMapProps.center,
			zoom: persistedMapProps.zoom,
			fitView: persistedMapProps.center === undefined && persistedMapProps.zoom === undefined,
			hitTolerance: 5
		};

		const selectedBaseMapName = persistedMapProps.baseMapName ?? olMapSettings.defaultBaseMapName;
		const tileLayers = getBaseMapLayers(selectedBaseMapName, olMapSettings.baseMapFilter);
		this.popup = new Popup('popover');

		const controls = getDefaultControls(projection);

		this.stationFilterControl = new StationFilterControl({
			element: document.getElementById('stationFilterCtrl') ?? undefined,
			isActive: persistedMapProps.isStationFilterCtrlActive ?? false,
			updatePersistedMapProps: this.updatePersistedMapProps,
			updateStationFilterInState: this.updateStationFilterInState.bind(this)
		});
		controls.push(this.stationFilterControl);

		this.layerControl = new LayerControl({
			element: document.getElementById('layerCtrl') ?? undefined,
			selectedBaseMapName,
			updateCtrl: this.updateLayerCtrl,
			updatePersistedMapProps
		});
		controls.push(this.layerControl);

		if (Object.keys(olMapSettings.sridsInMap).length > 1)
			controls.push(this.createProjectionControl(persistedMapProps, updateMapSelectedSRID));

		const olProps = {
			mapRootelement: mapRootelement,
			projection,
			tileLayers,
			mapOptions: this.mapOptions,
			popupTemplate: this.popup,
			controls,
			updatePersistedMapProps
		};

		// Create map component in OLWrapper. Anything that uses map must be handled after map creation
		this.olwrapper = new OLWrapper(olProps);
		this.addInteractivity();

		const minWidth = 600;
		const width = document.getElementsByTagName('body')[0].getBoundingClientRect().width;
		if (width < minWidth) return;

		getESRICopyRight(esriBaseMapNames).then(attributions => {
			this.olwrapper.attributionUpdater = new Copyright(attributions, projection, 'baseMapAttribution', minWidth);
		});
	}

	private async fetchCountriesTopo() {
		// countriesTopo has geometric problems in SWEREF99 TM so skip it for SITES
		if (config.envri === 'SITES')
			return;
		
		this.countriesTopo = await getCountriesGeoJson();

		const countriesTopoBM: LayerWrapper = this.getLayerWrapper({
			id: 'countries',
			name: 'Countries',
			layerType: 'baseMap',
			geoType: 'geojson',
			data: this.countriesTopo,
			style: olStyles.countryStyle,
			zIndex: 100,
			interactive: false
		});
		this.olwrapper.addGeoJson(countriesTopoBM, 'EPSG:4326', this.olWrapper.projection, this.olWrapper.viewParams.extent);

		const countriesTopoToggle: LayerWrapper = this.getLayerWrapper({
			id: countryBordersId,
			name: 'Country borders',
			layerType: 'toggle',
			geoType: 'geojson',
			data: this.countriesTopo,
			style: olStyles.countryBorderStyle,
			zIndex: 100,
			interactive: false
		});
		this.olwrapper.addToggleLayers([countriesTopoToggle]);
	}

	private toggleLayerVisibility(layerId: string) {
		const visibleToggles = this.persistedMapProps.visibleToggles;
		return visibleToggles === undefined || visibleToggles.includes(layerId)
	}

	private createProjectionControl(persistedMapProps: PersistedMapPropsExtended, updateMapSelectedSRID: UpdateMapSelectedSRID) {
		return new ProjectionControl({
			element: document.getElementById('projSwitchCtrl') ?? undefined,
			supportedSRIDs: olMapSettings.sridsInMap,
			selectedSRID: persistedMapProps.srid ?? olMapSettings.defaultSRID,
			switchProjAction: updateMapSelectedSRID
		});
	}

	updatePoints(includedStationUris: Value[], allSpecTableStationUris: Value[]) {
		const stationUrisDiff = difference(allSpecTableStationUris, includedStationUris);
		const excludedStations = createPointData(stationUrisDiff, this.stationFilterControl.stationPosLookup, {[isIncludedStation]: false});
		const includedStations = createPointData(includedStationUris, this.stationFilterControl.stationPosLookup, {[isIncludedStation]: true});

		const excludedStationsToggle: LayerWrapper = this.getLayerWrapper({
			id: 'excludedStations',
			name: 'Station filtered out',
			layerType: 'toggle',
			geoType: 'point',
			data: excludedStations,
			style: olMapSettings.iconStyles.excludedStation,
			zIndex: 110,
			interactive: true
		});
		const includedStationsToggle: LayerWrapper = this.getLayerWrapper({
			id: 'includedStations',
			name: 'Station',
			layerType: 'toggle',
			geoType: 'point',
			data: includedStations,
			style: olMapSettings.iconStyles.includedStation,
			zIndex: 120,
			interactive: true
		});

		this.olwrapper.addToggleLayers([includedStationsToggle, excludedStationsToggle]);
		this.layerControl.updateCtrl();
	}

	getLayerWrapper({id, name, layerType, geoType, data, style, zIndex, interactive}: LayerWrapperArgs): LayerWrapper {
		const visible = layerType === 'toggle'
			? getLayerVisibility(this.olWrapper.map, id, this.toggleLayerVisibility(id))
			: getLayerVisibility(this.olWrapper.map, id, this.persistedMapProps.baseMapName === name);

		return {
			id,
			layerType,
			geoType,
			name,
			layerProps: { id },
			visible,
			data,
			style,
			options: { zIndex, interactive }
		};
	}

	incomingPropsUpdated(props: UpdateProps) {
		const { specTable, stationPos4326Lookup, labelLookup, spatialStationsFilter, mapProps } = props;
		const isReadyForStationPosLookup = this.stationFilterControl.stationPosLookup.empty !== undefined
			&& stationPos4326Lookup.length > 0
			&& Object.keys(labelLookup).length > 0;

		if (isReadyForStationPosLookup) {
			this.stationPos4326Lookup = stationPos4326Lookup;
			this.allStationUris = stationPos4326Lookup.map(s => s.station);
			this.stationFilterControl.stationPosLookup = getStationPosLookup(stationPos4326Lookup, this.pointTransformer, labelLookup, this.allStationUris);
			this.stationFilterControl.restoreDrawFeaturesFromMapProps(mapProps);
		}

		if (this.stationFilterControl.stationPosLookup.empty === undefined) {
			const stationUris = this.stationFilterControl.updateStationUris(specTable, this.allStationUris, spatialStationsFilter);

			if (stationUris.hasChanged) {
				this.updatePoints(stationUris.includedStationUris, this.allStationUris);
				this.stationFilterControl.restoreDrawFeaturesFromMapProps(mapProps);
			}
		}
	}

	updateLayerCtrl(self: LayerControl): () => void {
		return () => {
			if (self.map === undefined)
				return;
			
			self.layersDiv.innerHTML = '';
			const baseMaps = self.baseMaps;
			const toggles = self.toggles;

			if (baseMaps.length) {
				const root = document.createElement('div');
				root.setAttribute('class', 'ol-layer-control-basemaps');
				const lbl = document.createElement('label');
				lbl.innerHTML = 'Base maps';
				root.appendChild(lbl);

				baseMaps.forEach(bm => {
					const row = document.createElement('div');
					const id = self.createId('radio', bm.get('name'));

					const radio = document.createElement('input');
					radio.setAttribute('id', id);
					radio.setAttribute('name', 'basemap');
					radio.setAttribute('type', 'radio');
					radio.setAttribute('style', 'margin:0px 5px 0px 0px;');
					if (bm.getVisible()) {
						radio.setAttribute('checked', 'true');
					}
					radio.addEventListener('change', () => self.toggleBaseMaps(bm.get('name')));
					row.appendChild(radio);

					const lbl = document.createElement('label');
					lbl.setAttribute('for', id);
					lbl.innerHTML = bm.get('name');
					row.appendChild(lbl);

					root.appendChild(row);
				});

				self.layersDiv.appendChild(root);
			}

			if (toggles.length) {
				const addToggleLayer = (toggleLayer: VectorLayer) => {
					const legendItem = getLayerIcon(toggleLayer);
					const row = document.createElement('div');
					row.setAttribute('style', 'display:table;');
					const id = self.createId('toggle', toggleLayer.get('name'));

					const toggle = document.createElement('input');
					toggle.setAttribute('id', id);
					toggle.setAttribute('type', 'checkbox');
					toggle.setAttribute('style', 'display:table-cell;');
					if (toggleLayer.getVisible()) {
						toggle.setAttribute('checked', 'true');
					}
					toggle.addEventListener('change', () => self.toggleLayers(toggleLayer.get('id'), toggle.checked));
					row.appendChild(toggle);

					if (legendItem) {
						const legendItemContainer = document.createElement('span');
						legendItemContainer.setAttribute('style', 'display:table-cell; width:21px; text-align:center;');						
						legendItem.id = id.replace('toggle', 'canvas');
						legendItem.setAttribute('style', 'vertical-align:sub; margin-right:unset;');
						legendItemContainer.appendChild(legendItem);
						row.appendChild(legendItemContainer);
					} else {
						const emptyCell = document.createElement('span');
						emptyCell.setAttribute('style', 'display:table-cell; width:5px;');
						row.appendChild(emptyCell);
					}

					const lbl = document.createElement('label');
					lbl.setAttribute('for', id);
					lbl.setAttribute('style', 'display:table-cell;');

					const lblTxt = document.createElement('span');
					lblTxt.innerHTML = toggleLayer.get('name');
					lbl.appendChild(lblTxt);
					row.appendChild(lbl);

					root.appendChild(row);
				};

				const root = document.createElement('div');
				root.setAttribute('class', 'ol-layer-control-toggles');
				const lbl = document.createElement('label');
				lbl.innerHTML = 'Layers';
				root.appendChild(lbl);

				toggles
					.filter(toggleLayer => toggleLayer.get('id') === countryBordersId)
					.forEach(toggleLayer => addToggleLayer(toggleLayer as VectorLayer));
				toggles
					.filter(toggleLayer => toggleLayer.get('id') !== countryBordersId)
					.forEach(toggleLayer => addToggleLayer(toggleLayer as VectorLayer));

				self.layersDiv.appendChild(root);
			}
		};
	}

	private addInteractivity() {
		const map = this.olwrapper.map;
		const popupOverlay = this.olwrapper.popupOverlay;
		const popup = this.popup;

		const select = new Select({
			condition: condition.pointerMove,
			layers: layer => layer.get('interactive'),
			multi: true,
			hitTolerance: this.mapOptions.hitTolerance
		});
		map.addInteraction(select);

		select.on('select', e => {
			if (popupOverlay === undefined) return;

			const features: Collection<Feature<Point>> = e.target.getFeatures();
			const numberOfFeatures = features.getLength();

			if (numberOfFeatures) {
				popup.reset();

				const feature = features.getArray()[0];
				const name = feature.get('stationLbl');
				const isIncluded = feature.get(isIncludedStation);

				popup.addContent(`${isIncluded ? 'Included' : 'Excluded'} station`, {
					Name: name
				});

				if (numberOfFeatures > 1)
					popup.addTxtToContent(`Zoom in to see ${numberOfFeatures - 1} more`);

				popupOverlay.setPosition(feature.getGeometry()?.getCoordinates() ?? e.mapBrowserEvent.coordinate);

			} else {
				popupOverlay.setPosition(undefined);
			}
		});
	}

	get olWrapper() {
		return this.olwrapper;
	}

	get appDisplayEPSGCode() {
		return this.appEPSGCode;
	}
}

const getStationPosLookup = (stationPos4326Lookup: StationPos4326Lookup[], pointTransformer: TransformPointFn, labelLookup: State['labelLookup'], allSpecTableStationUris: Value[]) =>
	stationPos4326Lookup.reduce<StationPosLookup>((acc, st) => {
		if (allSpecTableStationUris.includes(st.station)) {
			acc[st.station] = {
				coord: pointTransformer(st.lon, st.lat),
				stationLbl: labelLookup[st.station].label ?? st.station
			};
		}
		return acc;
	}, {});

const createPointData = (stations: Value[], stationPosLookup?: StationPosLookup, additionalAttributes: PointData['attributes'] = {}) => {
	if (stationPosLookup === undefined) return [];

	return stations.reduce<PointData[]>((acc, st) => {
		if (st && stationPosLookup[st]) {
			const { coord, ...attributes } = stationPosLookup[st];
			acc.push({
				coord: coord,
				attributes: {
					id: st,
					...attributes,
					...additionalAttributes
				}
			});
		}
		return acc;
	}, []);
};

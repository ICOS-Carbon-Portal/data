import Select from 'ol/interaction/Select';
import * as condition from 'ol/events/condition';
import { Collection, Feature } from 'ol';
import {LabelLookup, MapProps, State, StationPos4326Lookup} from './State';
import { UrlStr } from '../backend/declarations';
import {difference, throwError} from '../utils';
import {Filter, Value} from './SpecTable';
import config, { OlMapSettings } from '../config';
import { Coordinate } from 'ol/coordinate';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import { CountriesTopo, getCountriesGeoJson } from '../backend';
import { DrawFeature, StationFilterControl } from './StationFilterControl';
import Control from 'ol/control/Control';
import Map from 'ol/Map';
import {
	BaseMapId, Copyright, countryBorderStyle, countryStyle,
	EpsgCode, getLayerWrapper,
	esriBaseMapNames,
	getBaseMapLayers,
	getDefaultControls,
	getESRICopyRight, getLayerIcon, getLayerVisibility,
	getProjection,
	getTransformPointFn,
	LayerControl, LayerWrapper, LayerWrapperArgs,
	MapOptions,
	OLWrapper,
	PersistedMapProps, PointData,
	Popup, ProjectionControl,
	SupportedSRIDs
} from "icos-cp-ol";
import VectorSource from 'ol/source/Vector';
import Geometry from 'ol/geom/Geometry';
import deepEqual from 'deep-equal';


export type UpdateMapSelectedSRID = (srid: SupportedSRIDs) => void
export type TransformPointFn = (lon: number, lat: number) => number[]
interface MapOptionsExpanded extends Partial<MapOptions> {
	center?: Coordinate
	hitTolerance: number
}
export interface PersistedMapPropsExtended<BMN = BaseMapId> extends PersistedMapProps<BMN> {
	drawFeatures?: DrawFeature[]
	isStationFilterCtrlActive?: boolean
}
interface Props extends UpdateProps {
	stationPos4326Lookup: StationPos4326Lookup
	labelLookup: LabelLookup
	mapRootElement: HTMLElement
	persistedMapProps: PersistedMapPropsExtended
	updatePersistedMapProps: (persistedMapProps: PersistedMapPropsExtended) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
	showWarning: (message: string) => void
	idPrefix?: string
	iconStyles?: OlMapSettings['iconStyles']
	keepFitted?: boolean
	showDeleteRectBtns?: boolean
	hideExcludedStations?: boolean
}
interface UpdateProps {
	allStations: UrlStr[]
	selectedStations: UrlStr[]
	mapProps: MapProps
}
export type StationPosLookup = Record<UrlStr, { coord: number[], stationLbl: string }>

const countryBordersId = 'countryBorders';
const excludedStationsId = 'excludedStations';
const includedStationsId = 'includedStations';
const olMapSettings = config.olMapSettings;
const isIncludedStation = 'isIncluded';

export default class InitMap {
	public readonly olWrapper: OLWrapper;
	private appEPSGCode: EpsgCode;
	private mapOptions: MapOptionsExpanded;
	private popup: Popup;
	private readonly layerControl: LayerControl;
	private readonly stationFilterControl: StationFilterControl;
	private allStations: UrlStr[]
	private selectedStations: UrlStr[]
	private mapProps: MapProps
	private stationPosLookup: StationPosLookup
	private countriesTopo?: CountriesTopo;
	private persistedMapProps: PersistedMapPropsExtended<BaseMapId | 'Countries'>;
	private readonly getStationPosLookup: () => StationPosLookup
	private readonly idPrefix: string
	private readonly iconStyles: OlMapSettings['iconStyles']
	private readonly hideExcludedStations: boolean

	constructor(props: Props) {
		const {mapRootElement, persistedMapProps, updatePersistedMapProps} = props;

		this.persistedMapProps = persistedMapProps;
		this.idPrefix = props.idPrefix ?? '';
		this.iconStyles = props.iconStyles ?? olMapSettings.iconStyles;
		this.hideExcludedStations = props.hideExcludedStations ?? false;
		this.fetchCountriesTopo();

		this.allStations = props.allStations
		this.selectedStations = props.selectedStations
		this.mapProps = props.mapProps

		const srid = persistedMapProps.srid === undefined
			? olMapSettings.defaultSRID
			: persistedMapProps.srid;
		this.appEPSGCode = `EPSG:${srid}` as EpsgCode;
		const projection = getProjection(this.appEPSGCode) ?? throwError(`Projection ${this.appEPSGCode} not found`);

		this.mapOptions = {
			center: persistedMapProps.center,
			zoom: persistedMapProps.zoom,
			fitView: persistedMapProps.center === undefined && persistedMapProps.zoom === undefined,
			hitTolerance: 5
		};

		const selectedBaseMap = persistedMapProps.baseMap ?? olMapSettings.defaultBaseMap;
		const tileLayers = getBaseMapLayers(selectedBaseMap, olMapSettings.baseMapFilter);
		this.popup = new Popup(this.idPrefix + 'popover');

		const controls: Control[] = getDefaultControls(projection);

		const pointTransformer = getTransformPointFn("EPSG:4326", this.appEPSGCode)
		this.getStationPosLookup = () => this.allStations.reduce<StationPosLookup>(
			(acc, st) => {
				const latLon = props.stationPos4326Lookup[st];
				if(latLon) acc[st] = {
					coord: pointTransformer(latLon.lon, latLon.lat),
					stationLbl: props.labelLookup[st]?.label ?? st
				};
				return acc;
			},
			{}
		)

		this.stationPosLookup = this.getStationPosLookup()

		this.stationFilterControl = new StationFilterControl({
			element: document.getElementById(this.idPrefix + 'stationFilterCtrl') ?? undefined,
			isActive: persistedMapProps.isStationFilterCtrlActive ?? false,
			updatePersistedMapProps,
			showDeleteRectBtns: props.showDeleteRectBtns,
			srid,
			onDrawRejected: props.showWarning
		});
		controls.push(this.stationFilterControl);

		this.layerControl = new LayerControl({
			element: document.getElementById(this.idPrefix + 'layerCtrl') ?? undefined,
			selectedBaseMap,
			updateCtrl: this.updateLayerCtrl.bind(this)
		});
		this.layerControl.on('change', e => {
			const layerCtrl = e.target as LayerControl;
			updatePersistedMapProps({
				baseMap: layerCtrl.selectedBaseMap,
				visibleToggles: layerCtrl.visibleToggleLayerIds
			});
		});
		controls.push(this.layerControl);

		if (Object.keys(olMapSettings.sridsInMap).length > 1)
			controls.push(this.createProjectionControl(persistedMapProps, props.updateMapSelectedSRID));

		const olProps = {
			mapRootElement,
			projection,
			tileLayers,
			mapOptions: this.mapOptions,
			popupTemplate: this.popup,
			controls
		};

		// Create map component in OLWrapper. Anything that uses map must be handled after map creation
		this.olWrapper = new OLWrapper(olProps);
		this.addInteractivity();

		if (props.keepFitted)
			this.olWrapper.map.on('change:size', () => this.fitView());

		this.olWrapper.map.on("moveend", e => {
			const map = e.target as Map;
			const view = map.getView();
			updatePersistedMapProps({ center: view.getCenter(), zoom: view.getZoom() });
		});

		const minWidth = 600;
		const bodyWidth = document.getElementsByTagName('body')[0].getBoundingClientRect().width;

		// Copyright hides itself below minWidth anyway, so on narrow screens skip the fetch
		if (bodyWidth >= minWidth) {
			getESRICopyRight(esriBaseMapNames).then(attributions => {
				this.olWrapper.attributionUpdater = new Copyright(attributions, projection, this.idPrefix + 'baseMapAttribution', minWidth);
			});
		}

		this.updatePoints()
	}

	private fitView() {
		const size = this.olWrapper.map.getSize();
		if (size === undefined || size[0] === 0 || size[1] === 0) return;

		this.olWrapper.map.getView().fit(this.olWrapper.viewParams.extent, { size });
	}

	private async fetchCountriesTopo() {
		// countriesTopo has geometric problems in SWEREF99 TM so skip it for SITES
		if (config.envri === 'SITES')
			return;

		this.countriesTopo = await getCountriesGeoJson();

		const countriesTopoBM: LayerWrapper = this.getLayerWrapper({
			id: 'countries',
			label: 'Countries',
			layerType: 'baseMap',
			geoType: 'geojson',
			data: this.countriesTopo,
			style: countryStyle,
			zIndex: 100,
			interactive: false
		});
		this.olWrapper.addGeoJson(countriesTopoBM, 'EPSG:4326', this.olWrapper.projection, this.olWrapper.viewParams.extent);

		const countriesTopoToggle: LayerWrapper = this.getLayerWrapper({
			id: countryBordersId,
			label: 'Country borders',
			layerType: 'toggle',
			geoType: 'geojson',
			data: this.countriesTopo,
			style: countryBorderStyle,
			zIndex: 100,
			interactive: false
		});
		this.olWrapper.addToggleLayers([countriesTopoToggle]);
	}

	private toggleLayerVisibility(layerId: string): boolean {
		if (this.hideExcludedStations && layerId === excludedStationsId) return false;

		const visibleToggles = this.persistedMapProps.visibleToggles;
		return visibleToggles === undefined || visibleToggles.includes(layerId);
	}

	private createProjectionControl(persistedMapProps: PersistedMapPropsExtended, updateMapSelectedSRID: UpdateMapSelectedSRID) {
		return new ProjectionControl({
			element: document.getElementById(this.idPrefix + 'projSwitchCtrl') ?? undefined,
			supportedSRIDs: olMapSettings.sridsInMap,
			selectedSRID: persistedMapProps.srid ?? olMapSettings.defaultSRID,
			switchProjAction: updateMapSelectedSRID
		});
	}

	private updatePoints() {
		const excludedUris = difference(this.allStations, this.selectedStations);
		const excludedStations = createPointData(excludedUris, this.stationPosLookup, {[isIncludedStation]: false});
		const includedStations = createPointData(this.selectedStations, this.stationPosLookup, {[isIncludedStation]: true});

		const excludedStationsToggle: LayerWrapper = this.getLayerWrapper({
			id: excludedStationsId,
			label: 'Station filtered out',
			layerType: 'toggle',
			geoType: 'point',
			data: excludedStations,
			style: this.iconStyles.excludedStation,
			zIndex: 110,
			interactive: true
		});
		const includedStationsToggle: LayerWrapper = this.getLayerWrapper({
			id: includedStationsId,
			label: 'Station',
			layerType: 'toggle',
			geoType: 'point',
			data: includedStations,
			style: this.iconStyles.includedStation,
			zIndex: 120,
			interactive: true
		});

		this.olWrapper.addToggleLayers([includedStationsToggle, excludedStationsToggle]);
		this.layerControl.updateCtrl();
		this.stationFilterControl.reDrawFeaturesFromMapProps(this.mapProps);
	}

	getLayerWrapper({id, label, layerType, geoType, data, style, zIndex, interactive}: Omit<LayerWrapperArgs, 'visible'>): LayerWrapper {
		const visible = layerType === 'toggle'
			? getLayerVisibility(this.olWrapper.map, id, this.toggleLayerVisibility(id))
			: getLayerVisibility(this.olWrapper.map, id, this.persistedMapProps.baseMap === id);

		return getLayerWrapper({
			id,
			label,
			layerType,
			visible,
			geoType,
			data,
			style,
			zIndex,
			interactive
		});
	}

	incomingPropsUpdated(props: UpdateProps): void {
		const stationListIsSame = Filter.areEqual(this.allStations, props.allStations);
		const spatFilterIsSame = Filter.areEqual(this.selectedStations, props.selectedStations);
		const mapPropsIsSame = deepEqual(this.mapProps, props.mapProps);

		if (stationListIsSame && spatFilterIsSame && mapPropsIsSame) {
			return;
		}

		this.allStations = props.allStations;
		this.selectedStations = props.selectedStations;
		this.mapProps = props.mapProps;

		if (!stationListIsSame){
			this.stationPosLookup = this.getStationPosLookup();
		}

		if (stationListIsSame && spatFilterIsSame) {
			this.stationFilterControl.reDrawFeaturesFromMapProps(this.mapProps);
		} else {
			this.updatePoints();
		}
	}

	baseMapUpdated(baseMap: PersistedMapPropsExtended['baseMap']): void {
		if (baseMap === undefined || baseMap === this.layerControl.selectedBaseMap) return;

		this.layerControl.toggleBaseMaps(baseMap);
		this.persistedMapProps = {...this.persistedMapProps, baseMap};
		this.layerControl.updateCtrl();
	}

	updateLayerCtrl(self: LayerControl): () => void {
		const createId = (ctrlType: 'radio' | 'toggle', layerId: string) =>
			this.idPrefix + self.createId(ctrlType, layerId);
		const baseMapGroupName = this.idPrefix + 'basemap';

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
					const id = createId('radio', bm.get('id'));

					const radio = document.createElement('input');
					radio.setAttribute('id', id);
					radio.setAttribute('name', baseMapGroupName);
					radio.setAttribute('type', 'radio');
					radio.setAttribute('style', 'margin:0px 5px 0px 0px;');
					if (bm.getVisible()) {
						radio.setAttribute('checked', 'true');
					}
					radio.addEventListener('change', () => self.toggleBaseMaps(bm.get('id')));
					row.appendChild(radio);

					const lbl = document.createElement('label');
					lbl.setAttribute('for', id);
					lbl.innerHTML = bm.get('label');
					row.appendChild(lbl);

					root.appendChild(row);
				});

				self.layersDiv.appendChild(root);
			}

			if (toggles.length) {
				const addToggleLayer = (toggleLayer: VectorLayer<VectorSource<Feature<Geometry>>>) => {
					const legendItem = getLayerIcon(toggleLayer);
					const row = document.createElement('div');
					row.setAttribute('style', 'display:table;');
					const id = createId('toggle', toggleLayer.get('id'));

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
					lblTxt.innerHTML = toggleLayer.get('label');
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
					.forEach(toggleLayer => addToggleLayer(toggleLayer as VectorLayer<VectorSource<Feature<Geometry>>>));
				toggles
					.filter(toggleLayer => toggleLayer.get('id') !== countryBordersId)
					.forEach(toggleLayer => addToggleLayer(toggleLayer as VectorLayer<VectorSource<Feature<Geometry>>>));

				self.layersDiv.appendChild(root);
			}
		};
	}

	private addInteractivity() {
		const map = this.olWrapper.map;
		const popupOverlay = this.olWrapper.popupOverlay;
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
				popup.resetContent();

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

	get appDisplayEPSGCode() {
		return this.appEPSGCode;
	}
}

function createPointData(stations: Value[], stationPosLookup: StationPosLookup, additionalAttributes: PointData['attributes'] = {}): PointData[] {
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

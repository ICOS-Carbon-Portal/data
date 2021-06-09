import OLWrapper, { MapOptions, PersistedMapProps, PointData, LayerWrapper } from './ol/OLWrapper';
import { getBaseMapLayers, getDefaultControls, getLayerIcon, getLayerVisibility } from "./ol/utils";
import { EpsgCode, getProjection, getTransformPointFn, SupportedSRIDs } from './ol/projections';
import Select from 'ol/interaction/Select';
import * as condition from 'ol/events/condition';
import { Collection, Feature } from 'ol';
import { State, StationPos4326Lookup } from './State';
import Popup from './ol/Popup';
import { LayerControl } from './ol/LayerControl';
import Copyright, { getESRICopyRight } from './ol/Copyright';
import { Obj } from '../../../common/main/types';
import CompositeSpecTable from './CompositeSpecTable';
import { UrlStr } from '../backend/declarations';
import { areEqual } from '../utils';
import { Value } from './SpecTable';
import config from '../config';
import { Coordinate } from 'ol/coordinate';
import { ProjectionControl } from './ol/ProjectionControl';
import { BaseMapName, esriBaseMapNames } from './ol/baseMaps';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import { CountriesTopo, getCountriesGeoJson } from '../backend';
import olStyles from './ol/styles';


export type UpdateMapSelectedSRID = (srid: SupportedSRIDs) => void
export type TransformPointFn = (lon: number, lat: number) => number[]
interface MapOptionsExpanded extends Partial<MapOptions> {
	center?: Coordinate
	hitTolerance: number
}

interface Props extends UpdateProps {
	mapRootelement: HTMLElement
	persistedMapProps: PersistedMapProps
	updatePersistedMapProps: (mapProps: PersistedMapProps) => void
	updateMapSelectedSRID: UpdateMapSelectedSRID
}

interface UpdateProps {
	specTable: CompositeSpecTable
	stationPos4326Lookup: StationPos4326Lookup[]
	labelLookup: State['labelLookup']
}

type StationPosLookup = Obj<{ coord: number[], stationLbl: string }, UrlStr>

const toggleLayerProps = {
	countries: {
		id: 'countries',
		name: 'Countries'
	},
	countryBorders: {
		id: 'countryBorders',
		name: 'Country borders'
	},
	includedStations: {
		id: 'includedStations',
		name: 'Station'
	},
	excludedStations: {
		id: 'excludedStations',
		name: 'Station filtered out'
	}
}

const olMapSettings = config.olMapSettings;

export default class InitMap {
	private olwrapper: OLWrapper;
	private appEPSGCode: EpsgCode;
	private mapOptions: MapOptionsExpanded;
	private popup: Popup;
	private readonly layerControl: LayerControl;
	private stationPosLookup?: StationPosLookup = undefined;
	private pointTransformer: TransformPointFn;
	private prevStationUris: UrlStr[] = [];
	private stationPos4326Lookup: StationPos4326Lookup[];
	private labelLookup: State['labelLookup'];
	private countriesTopo?: CountriesTopo;
	private persistedMapProps: PersistedMapProps<BaseMapName | 'Countries'>;

	constructor(props: Props) {
		const { mapRootelement, specTable, stationPos4326Lookup, labelLookup, updateMapSelectedSRID, persistedMapProps, updatePersistedMapProps } = props;
		this.persistedMapProps = persistedMapProps;
		this.fetchCountriesTopo();

		this.stationPos4326Lookup = stationPos4326Lookup;
		this.labelLookup = labelLookup;

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
		this.layerControl = new LayerControl({
			element: document.getElementById('layerCtrl') ?? undefined,
			selectedBaseMapName,
			updateCtrl: this.updateLayerCtrl
		});
		this.layerControl.on('change', _ => updatePersistedMapProps({
			baseMapName: this.layerControl.selectedBaseMap,
			visibleToggles: this.layerControl.visibleToggleLayers
		}));
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

		this.olwrapper = new OLWrapper(olProps);
		this.addInteractivity();

		const minWidth = 600;
		const width = document.getElementsByTagName('body')[0].getBoundingClientRect().width;
		if (width < minWidth) return;

		getESRICopyRight(esriBaseMapNames).then(attributions => {
			this.olwrapper.attributionUpdater = new Copyright(attributions, projection, 'baseMapAttribution', minWidth);
		});

		if (stationPos4326Lookup.length)
			this.incommingPropsUpdated({ specTable, stationPos4326Lookup, labelLookup });
	}

	private async fetchCountriesTopo() {
		if (config.envri === 'SITES')
			return;
		
		this.countriesTopo = await getCountriesGeoJson();

		if (this.countriesTopo) {
			const countriesTopoBM: LayerWrapper = {
				id: toggleLayerProps.countries.id,
				layerType: 'baseMap',
				geoType: 'geojson',
				name: toggleLayerProps.countries.name,
				layerProps: {},
				visible: getLayerVisibility(this.olWrapper.map, toggleLayerProps.countries.id, this.persistedMapProps.baseMapName === toggleLayerProps.countries.name),
				data: this.countriesTopo,
				style: olStyles.countryStyle,
				options: { zIndex: 100, interactive: false }
			};
			this.olwrapper.addGeoJson(countriesTopoBM, 'EPSG:4326', this.olWrapper.projection, this.olWrapper.viewParams.extent);

			const visibleToggles = this.persistedMapProps.visibleToggles;
			const countriesTopoToggle: LayerWrapper = {
				id: toggleLayerProps.countryBorders.id,
				layerType: 'toggle',
				geoType: 'geojson',
				name: toggleLayerProps.countryBorders.name,
				layerProps: {},
				visible: getLayerVisibility(this.olWrapper.map, toggleLayerProps.countryBorders.id, this.toggleLayerVisibility(toggleLayerProps.countryBorders.id)),
				data: this.countriesTopo,
				style: olStyles.countryBorderStyle,
				options: { zIndex: 100, interactive: false }
			};
			this.olwrapper.addToggleLayers([countriesTopoToggle]);
		}
	}

	private toggleLayerVisibility(layerId: string) {
		const visibleToggles = this.persistedMapProps.visibleToggles;
		return visibleToggles === undefined || visibleToggles.includes(layerId)
	}

	private createProjectionControl(persistedMapProps: PersistedMapProps, updateMapSelectedSRID: UpdateMapSelectedSRID) {
		return new ProjectionControl({
			element: document.getElementById('projSwitchCtrl') ?? undefined,
			supportedSRIDs: olMapSettings.sridsInMap,
			selectedSRID: persistedMapProps.srid ?? olMapSettings.defaultSRID,
			switchProjAction: updateMapSelectedSRID
		});
	}

	updatePoints(props: UpdateProps, urisForStations?: Value[]) {
		const { specTable } = props;
		const stationUris = urisForStations ?? specTable.getFilter('station') ?? specTable.getDistinctAvailableColValues('station');
		const allStationUris = specTable.getAllDistinctAvailableColValues('station');
		const stationUrisDiff = allStationUris.filter(st => !stationUris.includes(st));
		const excludedStations = createPointData(stationUrisDiff, this.stationPosLookup);
		const includedStations = createPointData(stationUris, this.stationPosLookup, { zoomToLayerExtent: true });

		const excludedStationsToggle: LayerWrapper = {
			id: toggleLayerProps.excludedStations.id,
			layerType: 'toggle',
			geoType: 'point',
			name: toggleLayerProps.excludedStations.name,
			layerProps: { id: toggleLayerProps.excludedStations.id },
			visible: getLayerVisibility(this.olWrapper.map, toggleLayerProps.excludedStations.id, this.toggleLayerVisibility(toggleLayerProps.excludedStations.id)),
			data: excludedStations,
			style: olMapSettings.iconStyles.excludedStation,
			options: { zIndex: 110, interactive: true }
		};
		const includedStationsToggle: LayerWrapper = {
			id: toggleLayerProps.includedStations.id,
			layerType: 'toggle',
			geoType: 'point',
			name: toggleLayerProps.includedStations.name,
			layerProps: { id: toggleLayerProps.includedStations.id },
			visible: getLayerVisibility(this.olWrapper.map, toggleLayerProps.includedStations.id, this.toggleLayerVisibility(toggleLayerProps.includedStations.id)),
			data: includedStations,
			style: olMapSettings.iconStyles.includedStation,
			options: { zIndex: 120, interactive: true }
		};

		this.olwrapper.addToggleLayers([includedStationsToggle, excludedStationsToggle]);
		this.layerControl.updateCtrl();
	}

	incommingPropsUpdated(props: UpdateProps) {
		const { specTable, stationPos4326Lookup, labelLookup } = props;

		this.stationPos4326Lookup = stationPos4326Lookup;
		this.labelLookup = labelLookup;

		if (this.stationPosLookup === undefined && stationPos4326Lookup.length) {
			this.stationPosLookup = getStationPosLookup(stationPos4326Lookup, this.pointTransformer, labelLookup);
		}

		if (this.stationPosLookup !== undefined && specTable.originsRows.length) {
			
			const stationUris = specTable.getFilter('station') ?? specTable.getDistinctAvailableColValues('station');
			const shouldRenderStations = !areEqual(stationUris, this.prevStationUris);

			if (shouldRenderStations) {
				this.updatePoints(props, stationUris);
			}

			this.prevStationUris = stationUris as UrlStr[];
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
				// const addToggleLayer = (toggleLayer: VectorLayer) => {
				// 	const legendItem = getLayerIcon(toggleLayer);
				// 	const row = document.createElement('div');
				// 	const id = self.createId('toggle', toggleLayer.get('name'));

				// 	const toggle = document.createElement('input');
				// 	toggle.setAttribute('id', id);
				// 	toggle.setAttribute('type', 'checkbox');
				// 	toggle.setAttribute('style', 'margin:0px 3px 0px 0px; vertical-align:middle;');
				// 	if (toggleLayer.getVisible()) {
				// 		toggle.setAttribute('checked', 'true');
				// 	}
				// 	toggle.addEventListener('change', () => self.toggleLayers(toggleLayer.get('id'), toggle.checked));
				// 	row.appendChild(toggle);

				// 	const lbl = document.createElement('label');
				// 	lbl.setAttribute('for', id);
				// 	lbl.style.verticalAlign = 'text-top';

				// 	if (legendItem) {
				// 		const legendItemContainer = document.createElement('span');
				// 		legendItemContainer.setAttribute('style', 'display:inline-block; width:20px; text-align:center;');
				// 		legendItem.id = id.replace('toggle', 'canvas');
				// 		legendItem.setAttribute('style', 'display:inline; vertical-align:middle;');
				// 		legendItemContainer.appendChild(legendItem);
				// 		lbl.appendChild(legendItemContainer);
				// 	} else {
				// 		lbl.style.marginLeft = '2px';
				// 	}

				// 	const lblTxt = document.createElement('span');
				// 	lblTxt.innerHTML = toggleLayer.get('name');
				// 	lbl.appendChild(lblTxt);
				// 	row.appendChild(lbl);

				// 	root.appendChild(row);
				// };
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
					.filter(toggleLayer => toggleLayer.get('name') === toggleLayerProps.countryBorders.name)
					.forEach(toggleLayer => addToggleLayer(toggleLayer as VectorLayer));
				toggles
					.filter(toggleLayer => toggleLayer.get('name') !== toggleLayerProps.countryBorders.name)
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
				const isIncluded = !!feature.get('zoomToLayerExtent');

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

const getStationPosLookup = (stationPos4326Lookup: StationPos4326Lookup[], pointTransformer: TransformPointFn, labelLookup: State['labelLookup']) =>
	stationPos4326Lookup.reduce<StationPosLookup>((acc, st) => {
		acc[st.station] = {
			coord: pointTransformer(st.lon, st.lat),
			stationLbl: labelLookup[st.station] ?? st.station
		};
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

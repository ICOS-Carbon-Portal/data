import OLWrapper, { MapOptions, PersistedMapProps, PointData } from './ol/OLWrapper';
import { getBaseMapLayers, getDefaultControls } from "./ol/utils";
import { EpsgCode, getProjection, getTransformPointFn, SupportedSRIDs } from './ol/projections';
import Style from 'ol/style/Style';
import Select from 'ol/interaction/Select';
import * as condition from 'ol/events/condition';
import { Collection, Feature } from 'ol';
import { State, StationPos4326Lookup } from './State';
import Popup from './ol/Popup';
import { ControlLayerGroup, LayerControl } from './ol/LayerControl';
import Copyright, { getESRICopyRight } from './ol/Copyright';
import { Obj } from '../../../common/main/types';
import CompositeSpecTable from './CompositeSpecTable';
import Circle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { UrlStr } from '../backend/declarations';
import { areEqual, pick } from '../utils';
import { Value } from './SpecTable';
import { Color } from 'ol/color';
import { ColorLike } from 'ol/colorlike';
import BaseLayer from 'ol/layer/Base';
import config from '../config';
import { Coordinate } from 'ol/coordinate';
import { ProjectionControl } from './ol/ProjectionControl';
import { esriBaseMapNames } from './ol/baseMaps';
import RegularShape from 'ol/style/RegularShape';
import Point from 'ol/geom/Point';


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

const cirlcePointStyle = (fillColor: Color | ColorLike, strokeColor: Color | ColorLike, radius: number, strokeWidth: number) => new Style({
	image: new Circle({
		radius,
		fill: new Fill({ color: fillColor }),
		stroke: new Stroke({ color: strokeColor, width: strokeWidth })
	})
});

const trianglePointStyle = (fillColor: Color | ColorLike, strokeColor: Color | ColorLike, radius: number, strokeWidth: number) => new Style({
	image: new RegularShape({
		radius,
		fill: new Fill({ color: fillColor }),
		stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
		points: 3,
	}),
});

const supportedSRIDsFriendlyNames: Obj<string, SupportedSRIDs> = {
	"3006": "Sweden (SWEREF99 TM)",
	"3035": "Europe (LAEA)",
	"4326": "World (Degrees)",
	"3857": "World (Mercator)",
	"54030": "World (Robinson)",
};

const excludedStationsId = 'excludedStations';
const includedStationsId = 'includedStations';
const updatableLayersFilter = (id: string) => (layer: BaseLayer) => layer.get('id') === id;


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

	constructor(props: Props) {
		const { mapRootelement, specTable, stationPos4326Lookup, labelLookup, updateMapSelectedSRID, persistedMapProps, updatePersistedMapProps } = props;

		this.stationPos4326Lookup = stationPos4326Lookup;
		this.labelLookup = labelLookup;

		this.appEPSGCode = persistedMapProps.srid === undefined
			? `EPSG:${config.defaultSRID}` as EpsgCode
			: `EPSG:${persistedMapProps.srid}` as EpsgCode;
		const projection = getProjection(this.appEPSGCode);
		this.pointTransformer = getTransformPointFn("EPSG:4326", this.appEPSGCode);

		this.mapOptions = {
			center: persistedMapProps.center,
			zoom: persistedMapProps.zoom,
			fitView: persistedMapProps.center === undefined && persistedMapProps.zoom === undefined,
			hitTolerance: 5
		};

		const tileLayers = getBaseMapLayers(persistedMapProps.baseMapName ?? config.defaultBaseMapName, config.baseMapFilter);
		this.popup = new Popup('popover');

		const controls = getDefaultControls(projection);
		this.layerControl = new LayerControl({
			element: document.getElementById('layerCtrl') ?? undefined,
			mapLayerFilter: ml => ml.get('name'),
			updateCtrl: this.updateCtrl
		});
		this.layerControl.on('change', _ => updatePersistedMapProps({ baseMapName: this.layerControl.selectedBaseMap }));

		const appSrids = config.envri === 'ICOS'
			? pick(supportedSRIDsFriendlyNames, '3035', '54030')
			: pick(supportedSRIDsFriendlyNames, '3006', '3035', '54030');
		const projectionControl = new ProjectionControl({
			element: document.getElementById('projSwitchCtrl') ?? undefined,
			supportedSRIDs: appSrids,
			selectedSRID: persistedMapProps.srid ?? config.defaultSRID,
			switchProjAction: updateMapSelectedSRID
		});

		const olProps = {
			mapRootelement: mapRootelement,
			projection,
			tileLayers,
			mapOptions: this.mapOptions,
			popupTemplate: this.popup,
			controls: controls.concat([this.layerControl, projectionControl]),
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
			this.updateProps({ specTable, stationPos4326Lookup, labelLookup });
	}

	updatePoints(props: UpdateProps, urisForStations?: Value[]) {
		const { specTable } = props;
		const stationUris = urisForStations ?? specTable.getFilter('station') ?? specTable.getDistinctAvailableColValues('station');
		const allStationUris = specTable.getAllDistinctAvailableColValues('station');
		const stationUrisDiff = allStationUris.filter(st => !stationUris.includes(st));
		const excludedStations = createPointData(stationUrisDiff, this.stationPosLookup);

		if (excludedStations.length)
			this.olwrapper.updatePoints(
				excludedStations,
				{ id: excludedStationsId },
				updatableLayersFilter(excludedStationsId),
				trianglePointStyle('white', 'black', 6, 1),
				{ zIndex: 100, interactive: true }
			);

		const includedStations = createPointData(stationUris, this.stationPosLookup, { zoomToLayerExtent: true });
		this.olwrapper.updatePoints(
			includedStations,
			{ id: includedStationsId },
			updatableLayersFilter(includedStationsId),
			cirlcePointStyle('tomato', 'white', 6, 2),
			{ zIndex: 100, interactive: true }
		);
	}

	updateProps(props: UpdateProps) {
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

	updateCtrl(self: LayerControl): () => void {
		return () => {
			self.layersDiv.innerHTML = '';
			const baseMaps = self.layerGroups.filter(lg => lg.layerType === 'baseMap');
			const toggles = self.layerGroups.filter(lg => lg.layerType === 'toggle');

			if (baseMaps.length) {
				const root = document.createElement('div');
				root.setAttribute('class', 'ol-layer-control-basemaps');
				const lbl = document.createElement('label');
				lbl.innerHTML = 'Base maps';
				root.appendChild(lbl);

				baseMaps.forEach(bm => {
					const row = document.createElement('div');
					const id = self.createId('radio', bm.name);
					row.setAttribute('class', 'row');

					const radio = document.createElement('input');
					radio.setAttribute('id', id);
					radio.setAttribute('name', 'basemap');
					radio.setAttribute('type', 'radio');
					if (bm.layers[0].getVisible()) {
						radio.setAttribute('checked', 'true');
					}
					radio.addEventListener('change', () => self.toggleBaseMaps((lg: ControlLayerGroup) => true, bm.name));
					row.appendChild(radio);

					const lbl = document.createElement('label');
					lbl.setAttribute('for', id);
					lbl.innerHTML = bm.name;
					row.appendChild(lbl);

					root.appendChild(row);
				});

				self.layersDiv.appendChild(root);
			}

			if (toggles.length) {
				const root = document.createElement('div');
				root.setAttribute('class', 'ol-layer-control-toggles');
				const lbl = document.createElement('label');
				lbl.innerHTML = 'Layers';
				root.appendChild(lbl);

				toggles.forEach(toggleGroup => {
					const row = document.createElement('div');
					const id = self.createId('toggle', toggleGroup.name);
					row.setAttribute('class', 'row');

					const toggle = document.createElement('input');
					toggle.setAttribute('id', id);
					toggle.setAttribute('type', 'checkbox');
					if (toggleGroup.layers[0].getVisible()) {
						toggle.setAttribute('checked', 'true');
					}
					toggle.addEventListener('change', () => self.toggleLayerGroup(toggleGroup.name, toggle.checked));
					row.appendChild(toggle);

					const lbl = document.createElement('label');
					lbl.setAttribute('for', id);
					lbl.innerHTML = toggleGroup.name;
					row.appendChild(lbl);

					root.appendChild(row);
				});

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
			const features: Collection<Feature<Point>> = e.target.getFeatures();
			const numberOfFeatures = features.getLength();

			if (numberOfFeatures) {
				popup.reset();

				const feature = features.getArray()[0];
				const name = feature.get('stationLbl');
				const isIncluded = feature.get('zoomToLayerExtent') ? 'Yes' : 'No';

				popup.addContent('Station', {
					Name: name,
					'Included in search': isIncluded
				});

				if (numberOfFeatures > 1)
					popup.addTxtToContent(`Zoom in to see ${numberOfFeatures - 1} more`);

				popupOverlay.setPosition(feature.getGeometry().getCoordinates());

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

const createPointData = (stations: Value[], stationPosLookup: StationPosLookup, additionalAttributes: PointData['attributes'] = {}) => {
	return stations.reduce<PointData[]>((acc, st) => {
		if (stationPosLookup[st]) {
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

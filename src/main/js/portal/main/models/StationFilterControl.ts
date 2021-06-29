import Control, { Options } from 'ol/control/Control';
import Map from 'ol/Map';
import Draw, { createBox, DrawEvent } from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeometryType from 'ol/geom/GeometryType';
import * as condition from 'ol/events/condition';
import Select, { SelectEvent } from 'ol/interaction/Select';
import { Collection, Feature } from 'ol';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Geometry from 'ol/geom/Geometry';
import { Obj } from '../../../common/main/types';
import { PersistedMapPropsExtended, StationPosLookup } from './InitMap';
import Polygon from 'ol/geom/Polygon';
import { Coordinate } from 'ol/coordinate';
import { emptyCompositeSpecTable } from './State';
import { Filter, Value } from './SpecTable';
import { areEqual, intersection, isDefined, union } from '../utils';
import CompositeSpecTable from './CompositeSpecTable';

export interface DrawFeature {
	id: Symbol
	type: string
	coords: Coordinate[][]
	stationUris: Value[]
}
export interface StationFilterControlOptions extends Options {
	drawFeatures: DrawFeature[]
	isActive: boolean
	updatePersistedMapProps: (mapProps: PersistedMapPropsExtended) => void
	updateStationFilterInState: (stationUrisToState: Value[]) => void
	updateMap: (stationUris: StationUris) => void
}
export interface StationUris {
	hasChanged: boolean
	allSpecTableStationUris: Value[]
	includedStationUris: Value[]
}
export interface StateStationUris {
	explicitSpecTableStationUris: Filter
	spatiallyFilteredStationUris: Value[]
	specTableStationUris: Value[]
	allSpecTableStationUris: Value[]
}

const delIconOffsetX = -13;
const delIconOffsetY = 13;

const iconStyle = new Style({
	text: new Text({
		offsetX: delIconOffsetX,
		offsetY: delIconOffsetY,
		font: '18px "Font Awesome 5 Free"',
		text: '\uf2ed',
		padding: [-2, -1, 0, 1],
		backgroundFill: new Fill({ color: 'WhiteSmoke' })
	}),
	
});

export class StationFilterControl extends Control {
	private controlButton: HTMLButtonElement;
	private drawSource: VectorSource;
	private draw: Draw;
	private drawLayer: VectorLayer;
	private deleteRectBtnSource: VectorSource;
	private deleteRectBtnLayer: VectorLayer;
	private isActive: boolean = false;
	private seletcs: Obj<Select> = {};
	private drawFeatures: DrawFeature[];
	private updatePersistedMapProps: (mapProps: PersistedMapPropsExtended) => void;
	private updateStationFilterInState: (stationUrisToState: Value[]) => void;
	public stationPosLookup: StationPosLookup = {
		empty: {
			coord: [],
			stationLbl: ''
		}
	};
	private specTable: CompositeSpecTable = emptyCompositeSpecTable;
	public stateStationUris: StateStationUris = {
		allSpecTableStationUris: [],
		explicitSpecTableStationUris: [],
		spatiallyFilteredStationUris: [],
		specTableStationUris: []
	}

	constructor(options: StationFilterControlOptions) {
		super(options );

		Control.call(this, {
			element: options.element,
			target: options.target
		});

		this.isActive = options.isActive;
		this.drawFeatures = options.drawFeatures;
		this.updatePersistedMapProps = options.updatePersistedMapProps;
		this.updateStationFilterInState = options.updateStationFilterInState;

		this.controlButton = this.drawCtrlBtn();
		this.setTooltip();

		this.deleteRectBtnSource = new VectorSource();
		this.deleteRectBtnLayer = new VectorLayer({
			source: this.deleteRectBtnSource,
			zIndex: 410
		});

		this.drawSource = new VectorSource({ wrapX: false });
		this.drawLayer = new VectorLayer({ source: this.drawSource, zIndex: 400 });
		this.draw = new Draw({
			source: this.drawSource,
			type: GeometryType.CIRCLE,
			geometryFunction: createBox(),
		});
		this.draw.on('drawend', this.addDrawFeature.bind(this));

		this.initSelects();
		this.restoreDrawFeatures();
	}

	private updateApp() {
		this.updatePersistedMapProps({ drawFeatures: this.drawFeatures });
		this.updateStationFilterInState(this.pickStationUrisToState());
	}

	private pickStationUrisToState(): Value[] {
		const stationUrisFromSpecTable = {
			explicitSpecTableStationUris: this.stateStationUris.explicitSpecTableStationUris,
			allSpecTableStationUris: this.stateStationUris.allSpecTableStationUris,
			specTableStationUris: this.stateStationUris.specTableStationUris
		};
		const prevSpatiallyFilteredStationUris = this.stateStationUris.spatiallyFilteredStationUris;
		const spatiallyFilteredStationUris = getSpatiallyFilteredStationUris(this.drawFeatures);

		if (spatiallyFilteredStationUris.length < prevSpatiallyFilteredStationUris.length) {
			return stationUrisFromSpecTable.explicitSpecTableStationUris === null
				? spatiallyFilteredStationUris
				: intersection(spatiallyFilteredStationUris, stationUrisFromSpecTable.explicitSpecTableStationUris);
		}

		if (spatiallyFilteredStationUris.length === 0 && stationUrisFromSpecTable.explicitSpecTableStationUris === null)
			return [];
		
		if (spatiallyFilteredStationUris.length === 0)
			return stationUrisFromSpecTable.explicitSpecTableStationUris as Value[];
		
		if (stationUrisFromSpecTable.explicitSpecTableStationUris === null)
			return spatiallyFilteredStationUris;

		return union(spatiallyFilteredStationUris, stationUrisFromSpecTable.explicitSpecTableStationUris);
	}

	updateStationUris(specTable: CompositeSpecTable): StationUris {
		if (specTable.id === this.specTable.id) {
			return {
				hasChanged: false,
				allSpecTableStationUris: [],
				includedStationUris: []
			}; 
		}

		this.specTable = specTable;
		const explicitSpecTableStationUris = specTable.getFilter('station');
		const allSpecTableStationUris = this.stateStationUris.allSpecTableStationUris.length
			? this.stateStationUris.allSpecTableStationUris
			: specTable.getDistinctAvailableColValues('station').filter(isDefined);
		const specTableStationUris = explicitSpecTableStationUris ?? allSpecTableStationUris;
		let spatiallyFilteredStationUris = getSpatiallyFilteredStationUris(this.drawFeatures);

		let hasSpatialFilterChanged = !areEqual(spatiallyFilteredStationUris, this.stateStationUris.spatiallyFilteredStationUris);
		const hasExplicitSpecTableChanged = !areEqual(explicitSpecTableStationUris ?? [], this.stateStationUris.explicitSpecTableStationUris ?? []);
		const hasSpecTableChanged = !areEqual(specTableStationUris, this.stateStationUris.specTableStationUris);
		const hasChanged = hasSpatialFilterChanged || hasSpecTableChanged;

		if (hasExplicitSpecTableChanged) {
			this.findDrawFeaturesForDeletion(explicitSpecTableStationUris ?? [])
				.forEach(drawFeature => this.removeSpatialFilter(drawFeature.id));
			spatiallyFilteredStationUris = getSpatiallyFilteredStationUris(this.drawFeatures);
			hasSpatialFilterChanged = !areEqual(spatiallyFilteredStationUris, this.stateStationUris.spatiallyFilteredStationUris);
		}

		let includedStationUris = hasSpatialFilterChanged
			? union(spatiallyFilteredStationUris, explicitSpecTableStationUris ?? [])
			: specTableStationUris;
		if (includedStationUris.length === 0)
			includedStationUris	= allSpecTableStationUris;

		this.stateStationUris = {
			allSpecTableStationUris,
			explicitSpecTableStationUris,
			spatiallyFilteredStationUris,
			specTableStationUris
		};

		return {
			hasChanged,
			allSpecTableStationUris,
			includedStationUris
		};
	}

	private initSelects() {
		this.seletcs.drawSelect = new Select({
			condition: condition.pointerMove,
			layers: [this.drawLayer, this.deleteRectBtnLayer],
			multi: true,
			hitTolerance: 2
		});
		this.seletcs.drawSelect.on('select', ev => {
			const map = this.getMap();
			const style = (map.getTarget() as HTMLElement).style;
			const { features, numberOfFeatures } = this.initSelectEvent(ev);

			if (numberOfFeatures === 0) {
				style.cursor = 'default';
				map.addInteraction(this.draw);

			} else if (numberOfFeatures === 1) {
				style.cursor = 'default';
				map.removeInteraction(this.draw);

			} else {
				map.removeInteraction(this.draw);
				features.forEach(feature => {
					if (feature.get('type') !== 'stationFilterRect') {
						style.cursor = 'pointer';
						feature.setStyle(iconStyle);
					}
				});
			}
		});

		this.seletcs.deleteRectSelect = new Select({
			condition: condition.click,
			layers: [this.deleteRectBtnLayer],
			multi: false,
			style: iconStyle,
			hitTolerance: 2
		});
		this.seletcs.deleteRectSelect.on('select', ev => {
			const { features } = this.initSelectEvent(ev);

			features.forEach(delBtnFeature => {
				const rectFeatures = this.drawSource.getFeatures().filter(drawRect => drawRect.get('id') === delBtnFeature.get('id'));
				if (rectFeatures.length < 1)
					return;

				const rectFeature = rectFeatures[0];
				this.drawSource.removeFeature(rectFeature);
				this.deleteRectBtnSource.removeFeature(delBtnFeature);
				this.removeDrawFeature(rectFeature.get('id'));
			});
		});
	}

	setMap(map: Map) {
		super.setMap(map);
		map.addLayer(this.drawLayer);
		map.addLayer(this.deleteRectBtnLayer);
		this.setActiveState(this.isActive);
	}

	private addDrawFeature(ev: DrawEvent) {
		ev.feature.setProperties({ id: Symbol(), type: 'stationFilterRect' });
		this.addDeleteFilterRectBtn(ev.feature);
		const drawFeature = featureToDrawFeature(ev.feature, this.stationPosLookup);
		this.drawFeatures.push(drawFeature);
		this.updateApp();
	}

	private removeAllDeleteRectBtns() {
		this.deleteRectBtnSource.clear(true);
	}

	private removeDrawFeature(id: Symbol) {
		const idx = this.drawFeatures.findIndex(f => f.id === id);
		this.drawFeatures.splice(idx, 1);
		this.updateApp();
	}

	private removeSpatialFilter(id: Symbol) {
		const idx = this.drawFeatures.findIndex(f => f.id === id);
		if (idx < 0)
			return;

		this.drawSource.getFeatures().filter(f => f.get('id') === id)
			.forEach(rectFeature => this.drawSource.removeFeature(rectFeature));
		this.deleteRectBtnSource.getFeatures().filter(f => f.get('id') === id)
			.forEach(delBtnFeature => this.deleteRectBtnSource.removeFeature(delBtnFeature));
		this.drawFeatures.splice(idx, 1);

		this.updatePersistedMapProps({ drawFeatures: this.drawFeatures });
	}

	private restoreDrawFeatures() {
		this.drawFeatures.forEach(df => {
			const feature = drawFeatureToFeature(df);
			this.drawSource.addFeature(feature);
		});
	}

	private restoreDeleteFilterRectBtns() {
		this.drawFeatures.forEach(df => {
			this.addDeleteFilterRectBtn(drawFeatureToFeature(df));
		});
	}

	private findDrawFeaturesForDeletion(explicitSpecTableStationUris: Value[]) {
		return this.drawFeatures.filter(df => intersection(explicitSpecTableStationUris, df.stationUris).length === 0);
	}

	private initSelectEvent(ev: SelectEvent) {
		const features: Collection<Feature> = ev.target.getFeatures();
		const numberOfFeatures = features.getLength();
		return {
			features,
			numberOfFeatures
		};
	}

	private drawCtrlBtn() {
		const controlButton = document.createElement('button');
		controlButton.onclick = this.onBtnClick.bind(this);

		const btnIcon = document.createElement('i');
		btnIcon.className = 'fa fa-solid fa-draw-polygon';
		controlButton.append(btnIcon);

		this.element.appendChild(controlButton);
		return controlButton;
	}

	private setTooltip() {
		const tooltip = `Tool for drawing rectangles to filter stations is ${this.isActive ? 'ON' : 'OFF'}`;
		this.controlButton.setAttribute('title', tooltip);
	}

	private addDeleteFilterRectBtn(feature: Feature<Geometry>) {
		const extent = feature.getGeometry()?.getExtent();
		if (extent === undefined) return;

		const iconFeature = new Feature({
			geometry: new Point(extent.slice(2))
		});
		iconFeature.set('id', feature.get('id'));
		
		iconFeature.setStyle(iconStyle);
		this.deleteRectBtnSource.addFeature(iconFeature);
	}

	private onBtnClick(ev: MouseEvent) {
		this.setActiveState(!this.isActive);
		this.updatePersistedMapProps({ isStationFilterCtrlActive: this.isActive });
		this.setTooltip();
	}

	private setActiveState(isActive: boolean) {
		const map = this.getMap();

		if (isActive) {
			map.addInteraction(this.draw);
			this.controlButton.setAttribute('style', 'background-color:DodgerBlue;');
			map.addInteraction(this.seletcs.drawSelect);
			map.addInteraction(this.seletcs.deleteRectSelect);

			this.restoreDeleteFilterRectBtns();

		} else {
			this.draw.abortDrawing();
			map.removeInteraction(this.draw);
			this.controlButton.removeAttribute('style');
			map.removeInteraction(this.seletcs.drawSelect);
			map.removeInteraction(this.seletcs.deleteRectSelect);

			this.removeAllDeleteRectBtns();
		}

		this.isActive = isActive;
	}
}

function getSpatiallyFilteredStationUris(drawFeatures: DrawFeature[]){
	return [...new Set(drawFeatures.flatMap(drawFeature => drawFeature.stationUris))];
}

function featureToDrawFeature(feature: Feature<Geometry>, stationPosLookup: StationPosLookup): DrawFeature {
	const geom = <Polygon>feature.getGeometry();
	const coords = geom.getCoordinates();
	const stationUris = Object.keys(stationPosLookup)
		.filter(stationURI => isPointInRectangle(coords, stationPosLookup[stationURI].coord));

	return {
		id: feature.get('id'),
		type: feature.get('type'),
		coords,
		stationUris
	};
}

function drawFeatureToFeature(drawFeature: DrawFeature) {
	return new Feature({
		geometry: new Polygon(drawFeature.coords),
		id: drawFeature.id,
		type: drawFeature.type,
		stationUris: drawFeature.stationUris
	});
}

const isPointInRectangle = (rectangles: Coordinate[][], point: Coordinate) => {
	return rectangles.some(rect => 
		point[0] >= rect[0][0] && point[0] <= rect[2][0] &&	// x
		point[1] >= rect[0][1] && point[1] <= rect[2][1]	// y
	);
};

import {ERROR, SPECTABLES_FETCHED, META_QUERIED, SPEC_FILTER_UPDATED, OBJECTS_FETCHED, SORTING_TOGGLED, STEP_REQUESTED} from './actions';
import {ROUTE_CHANGED, COLLECTION_ITEM_ADDED, COLLECTION_ITEM_REMOVED} from './actions';
import * as Toaster from 'icos-cp-toaster';
import CompositeSpecTable from './models/CompositeSpecTable';
import CollectionItem from './models/CollectionItem';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case SPECTABLES_FETCHED:
			let specTable = new CompositeSpecTable(action.specTables);
			let objCount = getObjCount(specTable);
			return update({
				specTable,
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case META_QUERIED:
			return update({
				metadata: action.metadata
			});

		case SPEC_FILTER_UPDATED:
			specTable = state.specTable.withFilter(action.varName, action.values);
			objCount = getObjCount(specTable);
			return update({
				specTable,
				objectTable: [],
				paging: freshPaging(objCount),
				sorting: updateSortingEnableness(state.sorting, objCount)
			});

		case OBJECTS_FETCHED:
			return update({
				objectsTable: action.objectsTable
			});

		case SORTING_TOGGLED:
			return update({
				objectTable: [],
				sorting: updateSorting(state.sorting, action.varName)
			});

		case STEP_REQUESTED:
			return update({
				objectTable: [],
				paging: updatePaging(state.paging, action.direction)
			});

		case ROUTE_CHANGED:
			return update({
				route: action.route
			});

		case COLLECTION_ITEM_ADDED:
			return update({
				collection: state.collection.addItem(new CollectionItem(action.objInfo)),
				toasterData: new Toaster.ToasterData(Toaster.TOAST_INFO, "Data object added to collection")
			});

		case COLLECTION_ITEM_REMOVED:
			return update({
				collection: state.collection.removeItem(action.id),
				toasterData: new Toaster.ToasterData(Toaster.TOAST_INFO, "Data object removed from collection")
			});

		default:
			return update({event: undefined});
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

function updateSorting(old, varName){
	const ascending = (old.varName === varName)
		? !old.ascending
		: false;
	return Object.assign({}, old, {varName, ascending});
}

function updateSortingEnableness(old, objCount){
	const isEnabled = objCount <= 1000;
	return isEnabled === old.isEnabled
		? old
		: Object.assign({}, old, {isEnabled});
}

function getObjCount(specTable){
	const originsTable = specTable.getTable('origins');
	return originsTable
		? originsTable.filteredRows.reduce((acc, next) => acc + (next.count || 0), 0)
		: 0;
}

const STEPSIZE = 20;

function freshPaging(objCount){
	return {
		objCount,
		offset: 0,
		limit: STEPSIZE
	};
}

function updatePaging(old, direction){
	if(direction < 0){
		if(old.offset == 0) return old;
		const offset = Math.max(0, old.offset - STEPSIZE);
		return Object.assign({}, old, {offset});

	} else if(direction > 0){
		if(old.offset + old.limit >= old.objCount) return old;
		if(old.offset + STEPSIZE >= old.objCount) return old;
		const offset = old.offset + STEPSIZE;
		return Object.assign({}, old, {offset});

	} else return old;
}


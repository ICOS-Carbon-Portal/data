import {Action} from "redux";
import {
	KnownDataObject,
	LabelLookup,
	MetaData,
	MetaDataWStats,
	StateSerialized,
	TsSettings,
	WhoAmI
} from "../models/State";
import {Sha256Str, AsyncResult, UrlStr} from "../backend/declarations";
import {
	fetchKnownDataObjects,
	getExtendedDataObjInfo,
	BootstrapData
} from "../backend";
import {ColNames, OriginsColNames, SpecTableSerialized} from "../models/CompositeSpecTable";
import SpecTable, {Filter} from "../models/SpecTable";
import {HelpItem} from "../models/HelpStorage";
import Cart from "../models/Cart";
import FilterTemporal from "../models/FilterTemporal";
import {SearchOption} from "../actions/types";
import {FilterNumber} from "../models/FilterNumbers";
import {PersistedMapPropsExtended} from "../models/InitMap";


export abstract class ActionPayload{}
export abstract class BootstrapRoutePayload extends ActionPayload{}
export abstract class BackendPayload extends ActionPayload{}
export abstract class MiscPayload extends ActionPayload{}
export abstract class PreviewPayload extends ActionPayload{}
export abstract class UiPayload extends ActionPayload{}
export abstract class FiltersPayload extends ActionPayload{}


export interface PortalPlainAction extends Action<string>{
	payload: ActionPayload
}

export class BootstrapRouteSearch extends BootstrapRoutePayload{
	constructor(){super();}
}

export class BootstrapRoutePreview extends BootstrapRoutePayload{
	constructor(
		readonly pids: Sha256Str[],
		readonly objectsTable: ObjectsTableLike,
		readonly extendedDobjInfo: AsyncResult<typeof getExtendedDataObjInfo>,
		readonly specTables?: SpecTableSerialized,
		readonly labelLookup?: LabelLookup,
	){super();}
}

export class BootstrapRouteMetadata extends BootstrapRoutePayload{
	constructor(readonly id: UrlStr, readonly metadata: MetaDataWStats, readonly objectsTable?: ObjectsTableLike){super();}
}

export class BootstrapRouteCart extends BootstrapRoutePayload{
	constructor(readonly extendedDobjInfo: AsyncResult<typeof getExtendedDataObjInfo>, readonly objectsTable: ObjectsTableLike, readonly labelLookup?: LabelLookup){super();}
}

export class BackendUserInfo extends BackendPayload{
	constructor(readonly user: WhoAmI, readonly profile: object){super();}
}

export class BootstrapInfo extends BackendPayload{
	constructor(readonly info: BootstrapData){super();}
}

export class BackendOriginsTable extends BackendPayload{
	constructor(
		readonly table: SpecTable<OriginsColNames>,
		readonly resetPaging: boolean = false
	){super();}
}

export class BackendUpdateSpecFilter extends BackendPayload{
	constructor(readonly varName: ColNames | 'keywordFilter', readonly filter: Filter){super();}
}

export class BackendObjectMetadataId extends BackendPayload{
	constructor(readonly id: UrlStr){super();}
}

export class BackendObjectMetadata extends BackendPayload{
	constructor(readonly metadata: MetaData){super();}
}

export class BackendExtendedDataObjInfo extends BackendPayload{
	constructor(readonly extendedDobjInfo: AsyncResult<typeof getExtendedDataObjInfo>){super();}
}

export class BackendTsSettings extends BackendPayload{
	constructor(readonly tsSettings: TsSettings){super();}
}

export class BackendUpdateCart extends BackendPayload{
	constructor(readonly cart: Cart){super();}
}

export class BackendUpdatePriorCart extends BackendPayload{
	constructor(readonly cart: Cart){super();}
}

export class BackendBatchDownload extends BackendPayload{
	constructor(readonly isBatchDownloadOk: boolean, readonly user: WhoAmI){super();}
}

export type ObjectsTableLike = AsyncResult<typeof fetchKnownDataObjects>['rows'] | KnownDataObject[];
export class BackendObjectsFetched extends BackendPayload{
	constructor(readonly objectsTable: ObjectsTableLike, readonly isDataEndReached: boolean){super();}
}

export class BackendKeywordsFetched extends BackendPayload {
	constructor(readonly scopedKeywords: string[]){super();}
}

export class BackendExportQuery extends BackendPayload {
	constructor(readonly isFetchingCVS: boolean, readonly sparqClientQuery: string) { super(); }
}

export class MiscError extends MiscPayload{
	constructor(readonly error: Error){super();}
}

export class MiscLoadError extends MiscPayload{
	constructor(readonly state: StateSerialized, readonly cart: Cart){super();}
}

export class MiscRestoreFromHistory extends MiscPayload{
	constructor(readonly historyState: StateSerialized){super();}
}

export class MiscResetFilters extends MiscPayload{
	constructor(){super();}
}

export class MiscRestoreFilters extends MiscPayload{
	constructor(){super();}
}

export class MiscUpdateSearchOption extends MiscPayload{
	constructor(readonly newSearchOption: SearchOption){super();}
}

export class MiscUpdateMapProps extends MiscPayload{
	constructor(readonly persistedMapProps: PersistedMapPropsExtended){super();}
}

export class MiscUpdateAddToCart extends MiscPayload {
	constructor(readonly addToCart: Sha256Str[] | undefined) { super(); }
}

export class RestorePreview extends PreviewPayload{
	constructor(){super();}
}

export class SetPreviewFromCart extends PreviewPayload{
	constructor(readonly ids: UrlStr[]){super();}
}

export class SetPreviewUrl extends PreviewPayload{
	constructor(readonly url: UrlStr){super();}
}

export class UiToggleSorting extends UiPayload{
	constructor(readonly varName: string){super();}
}

export class UiStepRequested extends UiPayload{
	constructor(readonly direction: -1 | 1){super();}
}

export class UiSwitchTab extends UiPayload{
	constructor(readonly tabName: string, readonly selectedTabId: number){super();}
}

export class UiUpdateHelpInfo extends UiPayload{
	constructor(readonly helpItem: HelpItem){super();}
}

export class UiInactivateAllHelp extends UiPayload{
	constructor(){super();}
}

export class UiUpdateCheckedObjsInSearch extends UiPayload{
	constructor(readonly checkedObjectInSearch: UrlStr | UrlStr[]){super();}
}

export class UiUpdateCheckedObjsInCart extends UiPayload{
	constructor(readonly checkedObjectInCart: UrlStr | UrlStr[]){super();}
}

export class FiltersTemporal extends FiltersPayload{
	constructor(readonly filterTemporal: FilterTemporal){super();}
}

export class FiltersNumber extends FiltersPayload{
	constructor(readonly numberFilter: FilterNumber){super();}
}

export class FilterKeywords extends FiltersPayload{
	constructor(readonly filterKeywords: string[]){super();}
}

export class FiltersUpdatePids extends FiltersPayload{
	constructor(readonly selectedPids: Sha256Str[] | null){super();}
}

export class FiltersUpdateFileName extends FiltersPayload {
	constructor(readonly fileName: string) { super(); }
}

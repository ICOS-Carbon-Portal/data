import {Action} from "redux";
import {MetaDataObject, SearchOptions, User} from "../models/State";
import {ThenArg, UrlStr} from "../backend/declarations";
import {fetchAllSpecTables, fetchDobjOriginsAndCounts} from "../backend";
import CompositeSpecTable from "../models/CompositeSpecTable";
import {SearchOption} from "../actions";


export abstract class ActionPayload{}
export abstract class BackendPayload extends ActionPayload{}
export abstract class MiscPayload extends ActionPayload{}


export interface PortalPlainAction extends Action<string>{
	payload: ActionPayload
}

export class BackendUserInfo extends BackendPayload{
	constructor(readonly user: User, readonly profile: object){super();}
}

export class BackendTables extends BackendPayload{
	constructor(readonly allTables: ThenArg<typeof fetchAllSpecTables>){super();}
}

export class BackendOriginsTable extends BackendPayload{
	constructor(readonly orgSpecTables: CompositeSpecTable, readonly dobjOriginsAndCounts: ThenArg<typeof fetchDobjOriginsAndCounts>){super();}
}

export class BackendObjectMetadataId extends BackendPayload{
	constructor(readonly id: UrlStr){super();}
}

export class BackendObjectMetadata extends BackendPayload{
	constructor(readonly metadata: MetaDataObject & {id: UrlStr}){super();}
}

export class MiscError extends MiscPayload{
	constructor(readonly error: Error){super();}
}

export class MiscInit extends MiscPayload{
	constructor(){super();}
}

export class MiscUpdateSearchOption extends MiscPayload{
	constructor(readonly oldSearchOptions: SearchOptions, readonly newSearchOption: SearchOption){super();}
}

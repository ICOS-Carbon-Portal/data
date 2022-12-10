import { BinRaster } from "icos-cp-backend";

//TODO add .withId method on BinRaster in the library, then get rid of this function
export function withChangedIdIfNeeded(br: BinRaster | undefined, id: string | undefined): BinRaster | undefined {
	if(br === undefined || id === undefined) return
	if(br.id === id) return br
	const data: DataView = ((br as any)._data as DataView)
	return new BinRaster(data.buffer, id)
}

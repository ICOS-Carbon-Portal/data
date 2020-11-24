import { BinRaster } from "icos-cp-backend";

export class BinRasterExtended extends BinRaster {
	public basicId: string;

	constructor(arrayBuf: ArrayBuffer, id: string, basicId: string) {
		super(arrayBuf, id);
		this.basicId = basicId;
	}
}

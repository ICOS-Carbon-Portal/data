export default class CanvasLegend {
	constructor(height, getLegend){
		this._height = height;
		this._getLegend = getLegend;
	}

	renderLegend(){
		const {colorMaker, valueMaker, suggestedTickLocations, max} = this._getLegend();

		const tickLocations = suggestedTickLocations.map(tl => Math.round(tl));
		const tickValues = tickLocations.map(tl => valueMaker(tl));

		const width = 3;
		const height = this._height;

		const canvas = document.createElement("canvas");

		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');

		setFont(ctx);
		const tickValueLengths = tickValues.map(tv => ctx.measureText(tv).width);
		const maxTxtLength = Math.max(...tickValueLengths);
		canvas.width = maxTxtLength + 15;
		setFont(ctx);

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let i = 0; i < height; i++) {
			let color = colorMaker(height - i);
			ctx.strokeStyle = `rgba(${color.map(c => Math.round(c)).join(',')})`;
			ctx.beginPath();
			ctx.moveTo(0, i);
			ctx.lineTo(canvas.width, i);
			ctx.stroke();
		}

		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;

		// Max value
		addTxt(ctx, canvas.width / 2, 8, canvas.width, valueMaker(height - 8));

		// Middle values
		for (let i = 1; i < tickLocations.length - 1; i++) {
			addTxt(ctx, canvas.width / 2, height - tickLocations[i], canvas.width, valueMaker(tickLocations[i]));
		}

		// Min value
		addTxt(ctx, canvas.width / 2, height - 8, canvas.width, valueMaker(8));

		ctx.strokeRect(0.5, 0.5, canvas.width - 1, height - 1);

		return canvas;
	}
}

const setFont = ctx => {
	ctx.font = 'bold 10px sans-serif';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
};

const addTxt = (ctx, x, y, width, txt) => {
	ctx.fillText(txt, x, y);

	ctx.beginPath();
	ctx.moveTo(0, y);
	ctx.lineTo(4, y);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(width - 4, y);
	ctx.lineTo(width, y);
	ctx.stroke();
};

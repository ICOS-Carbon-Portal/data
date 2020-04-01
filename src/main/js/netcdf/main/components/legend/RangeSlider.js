export default class RangeSlider {
	constructor() {
		this.totalRange = 0;
		this.maxValue = 0;
		this.minValue = 0;
		this.width = 0;
		this.margin = 0;
		this.startPosition = 0;
		this.endPosition = 0;
		this.cw = 0;
		this.ch = 0;

		const isTouchSupported = 'ontouchstart' in window;
		this.startEvent = isTouchSupported ? 'touchstart' : 'mousedown';
		this.moveEvent = isTouchSupported ? 'touchmove' : 'mousemove';
		this.endEvent = isTouchSupported ? 'touchend' : 'mouseup';
	}

	init(canvas, margin) {
		this.canvas = canvas;
		this.margin = margin;
		this.ctx = this.canvas.getContext('2d');
		this.draggable = false;
		this.mouseX = 0;
		this.mouseY = 0;

		this.cw = this.ctx.canvas.width;
		this.ch = this.ctx.canvas.height;
		this.totalRange = this.ch - 2 * margin;
		this.height = this.ch - (this.margin);
		this.startPosition = 0;
		this.endPosition = this.height - this.margin;

		const self = this;
		this.canvas.addEventListener(this.startEvent, function mousedown(e) {
			console.log('mousedown');
			self.draggable = true;
		}, false);
		this.canvas.addEventListener(this.endEvent, function mouseup(e) {
			console.log('mouseup');
			self.draggable = false;
		}, false);
		this.canvas.addEventListener(this.moveEvent, this.mousemove.bind(this), false);

		this.draw();
	}

	draw() {
		// this.clearCanvas();

		this.ctx.beginPath();
		this.ctx.fillStyle = "rgb(255,200,0)";
		this.ctx.moveTo(0, this.margin + this.startPosition);
		this.ctx.lineTo(this.cw, this.margin + this.startPosition);
		this.ctx.lineTo(this.cw / 2, this.margin + 10 + this.startPosition);
		this.ctx.lineTo(0, this.margin + this.startPosition);
		this.ctx.fill();

		// this.ctx.beginPath();
		// this.ctx.strokeStyle = "rgb(255,200,0)";
		// this.ctx.lineWidth = 3;
		// this.ctx.arc(this.margin, this.startPosition, 10, 0, 2 * Math.PI, true);
		// this.ctx.stroke();
		// this.ctx.beginPath();
		// this.ctx.arc(this.margin, this.endPosition, 10, 0, 2 * Math.PI, true);
		// this.ctx.stroke();
	}

	mousemove(e) {
		this.draw();

		e.stopPropagation();
		e.preventDefault();

		this.mouseX = e.layerX;
		this.mouseY = e.layerY;

		this.mouseX = (e.targetTouches)
			? e.targetTouches[0].layerX - this.canvas.offsetLeft
			: e.layerX - this.canvas.offsetLeft;
		this.mouseY = (e.targetTouches)
			? e.targetTouches[0].layerY - this.canvas.offsetTop
			: e.layerY - this.canvas.offsetTop;

		if (this.draggable) {

			//RangeStart
			var distance = this.getDistance(this.margin, this.startPosition);
			if (distance <= 70) {
				this.update(this.mouseY, true);
				return;
			}

			//RangeEnd
			var distance = this.getDistance(this.margin, this.endPosition);
			if (distance <= 70) {
				this.update(this.mouseY, false);
				return;
			}
		}
	}

	update(mouseY, cursor) {
		if (cursor) {
			this.startPosition = Math.min(mouseY, this.endPosition);
			this.startPosition = Math.max(this.startPosition, this.margin);

			// this.currentProgress = (this.startPosition - this.margin) / (this.height - this.margin);
			this.maxValue = this.totalRange * ((this.startPosition - this.margin) / this.height);

		} else {
			this.endPosition = Math.min(mouseY, this.height);
			this.endPosition = Math.max(this.endPosition, this.startPosition);

			// this.currentProgress = (this.endPosition - this.margin) / (this.height - this.margin);
			this.minValue = this.totalRange * ((this.endPosition - this.margin) / this.height);
		}

	}

	getDistance(px, py) {
		let xs = 0;
		let ys = 0;

		xs = px - this.mouseX;
		xs = xs * xs;

		ys = py - this.mouseY;
		ys = ys * ys;

		return Math.sqrt(xs + ys);
	}
}

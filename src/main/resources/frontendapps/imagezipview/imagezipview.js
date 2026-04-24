(() => {
	const select = document.getElementById('zipimageselect');
	const canvas = document.getElementById('multiimagezipframe');
	const ctx = canvas.getContext('2d');
	const urlParams = new URLSearchParams(window.location.search);
	const supportedImages = ['jpg', 'jpeg', 'png'];
	const previous = document.getElementById("previous-button");
	const next = document.getElementById("next-button");
	const enhanceButton = document.getElementById("enhance-button");
	let zipEntries = [];
	let enhanceEnabled = false;
	let currentSrc = null;

	const fullScreen = (window.self === window.top);

	if (fullScreen) {
		document.getElementById("container").className += " m-2";
	}

	// YlGnBu colormap stops (9-step, from matplotlib)
	const YLGNBU = [
		[255, 255, 229],
		[237, 248, 177],
		[199, 233, 180],
		[127, 205, 187],
		[65,  182, 196],
		[29,  145, 192],
		[34,   94, 168],
		[37,   52, 148],
		[8,    29,  88]
	];

	function applyColormap(t) {
		const n = YLGNBU.length - 1;
		const pos = t * n;
		const lo = Math.floor(pos);
		const hi = Math.min(lo + 1, n);
		const f = pos - lo;
		return YLGNBU[lo].map((c, i) => Math.round(c + f * (YLGNBU[hi][i] - c)));
	}

	function computePercentile(sorted, p) {
		const idx = (p / 100) * (sorted.length - 1);
		const lo = Math.floor(idx);
		const hi = Math.ceil(idx);
		return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
	}

	function handleImgLoad(event) {
		const errorDiv = document.getElementById('load-error');
		if (event.type === "error") {
			if (!errorDiv) {
				const div = document.createElement('div');
				div.id = 'load-error';
				div.className = 'text-danger mt-2';
				div.innerText = "This image could not be loaded; it may be missing or corrupt. Check the original data source for more information.";
				canvas.after(div);
			}
		} else {
			if (errorDiv) errorDiv.remove();
		}
	}

	function renderImage(src) {
		currentSrc = src;

		const img = new Image();

		img.addEventListener("load", (event) => {
			handleImgLoad(event);
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			ctx.drawImage(img, 0, 0);

			if (!enhanceEnabled) {
				updateColorbar(null, null);
				return;
			}

			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;
			const n = data.length / 4;

			// Convert to grayscale using luminance weights
			const gray = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				gray[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
			}

			// Compute 2nd and 98th percentile (mirrors np.nanpercentile in image.py)
			const sorted = Float32Array.from(gray).sort();
			const p2  = computePercentile(sorted, 2);
			const p98 = computePercentile(sorted, 98);
			const range = p98 - p2 || 1;

			// Apply stretch and YlGnBu colormap
			for (let i = 0; i < n; i++) {
				const t = Math.max(0, Math.min(1, (gray[i] - p2) / range));
				const [r, g, b] = applyColormap(t);
				data[i * 4]     = r;
				data[i * 4 + 1] = g;
				data[i * 4 + 2] = b;
				// alpha unchanged
			}

			ctx.putImageData(imageData, 0, 0);
			updateColorbar(p2, p98);
		};

		img.addEventListener("error", handleImgLoad);

		img.src = src;
	}

	function updateColorbar(min, max) {
		const container = document.getElementById('colorbar-container');
		if (!enhanceEnabled || min === null) {
			container.style.display = 'none';
			return;
		}

		container.style.display = '';

		const cbCtx = document.getElementById('colorbar-canvas').getContext('2d');
		const w = document.getElementById('colorbar-canvas').width;
		const h = document.getElementById('colorbar-canvas').height;
		for (let x = 0; x < w; x++) {
			const [r, g, b] = applyColormap(x / (w - 1));
			cbCtx.fillStyle = `rgb(${r},${g},${b})`;
			cbCtx.fillRect(x, 0, 1, h);
		}

		document.getElementById('colorbar-min').textContent = Math.round(min);
		document.getElementById('colorbar-max').textContent = Math.round(max);
	}

	function getCurrentURL() {
		return `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
	}

	function setInitialImage(imgIndex=0) {
		if (zipEntries.length === 0) {
			const infoDiv = document.createElement("div");
			infoDiv.innerText = "No images contained in this archive."
			canvas.parentElement.appendChild(infoDiv);
			canvas.parentElement.removeChild(canvas);
			previous.disabled = true;
			next.disabled = true;
			return;
		}
		select.selectedIndex = parseInt(imgIndex);
		const idx = select.selectedIndex;
		renderImage(zipEntries[idx].path);

		previous.disabled = idx <= 0;
		next.disabled = idx >= zipEntries.length - 1;
	}

	function updateDisplayedImage(step=0) {
		if (zipEntries.length === 0) return;

		// Use local idx variable to prevent auto-wrap to 0 on incrementing over bounds
		let idx = select.selectedIndex;
		idx += step;

		if (idx < 0) {
			idx = 0;
		} else if (idx >= zipEntries.length) {
			idx = zipEntries.length-1;
		}

		if (parseInt(urlParams.get("img")) !== idx) {
			urlParams.set("img", idx);
			if (fullScreen) {
				history.replaceState(null, "", getCurrentURL());
			} else {
				window.parent.postMessage(getCurrentURL());
			}
		}

		select.selectedIndex = idx;
		renderImage(zipEntries[idx].path);

		previous.disabled = idx <= 0;
		next.disabled = idx >= zipEntries.length - 1;
	}

	function handleKeydown(event) {
		if (event.target?.id !== "zipimageselect") {
			switch (event.key) {
				case "ArrowLeft":
				case "A":
				case "a":
					updateDisplayedImage(-1);
					break;
				case "ArrowRight":
				case "D":
				case "d":
					updateDisplayedImage(1);
					break;
			}
		}
	}

	function handleMessage(event) {
		if (event.isTrusted && event.data.keydown) {
			handleKeydown(new KeyboardEvent("keydown", {key: event.data.keydown}));
		}
	}

	select.addEventListener('change', () => updateDisplayedImage());
	previous.addEventListener('click', () => updateDisplayedImage(-1));
	next.addEventListener('click', () => updateDisplayedImage(1));

	enhanceButton.addEventListener('click', () => {
		enhanceEnabled = !enhanceEnabled;
		enhanceButton.classList.toggle('active', enhanceEnabled);
		if (currentSrc) renderImage(currentSrc);
	});

	document.addEventListener("keydown", handleKeydown);
	window.addEventListener("message", handleMessage);

	fetch(`/zip/${urlParams.get('objId')}/listContents`)
		.then(resp => resp.json())
		.then(json => {
			zipEntries = json.filter(ze => {
				const fileExt = ze.name.split(".").slice(-1)[0].toLowerCase();
				return supportedImages.includes(fileExt);
			});

			zipEntries.forEach((ze,i) => {
				const fname = ze.name.split("/").slice(-1)[0];
				const option = document.createElement("option");
				option.value = i;
				option.innerText = fname;
				select.appendChild(option);
			});
		})
		.then(() => setInitialImage(urlParams.get("img")), err => console.error(err));
})();

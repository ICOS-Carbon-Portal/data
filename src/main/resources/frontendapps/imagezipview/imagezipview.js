(() => {
	const select = document.getElementById('zipimageselect');
	const image =  document.getElementById('multiimagezipframe');
	const urlParams = new URLSearchParams(window.location.search);
	const supportedImages = ['jpg', 'jpeg', 'png'];
	const previous = document.getElementById("previous-button");
	const next = document.getElementById("next-button");
	let zipEntries = [];

	const fullScreen = (window.self === window.top);

	if (fullScreen) {
		document.getElementById("container").className += " m-2"
	}

	function getCurrentURL() {
		return `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
	}

	function setInitialImage(imgIndex=0) {
		select.selectedIndex = parseInt(imgIndex);
		const idx = select.selectedIndex;
		image.src = zipEntries[idx].path;
			
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

		if (idx !== select.selectedIndex) {
			urlParams.set("img", idx);
			if (fullScreen) {
				history.replaceState(null, "", getCurrentURL());
			} else {
				window.parent.postMessage(getCurrentURL());
			}
		}

		select.selectedIndex = idx;

		image.src = zipEntries[idx].path;

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

	function handleImgLoad(event) {
		const img = event.target;
		if (event.type === "error") {
			img.alt = "This image could not be loaded; it may be missing or corrupt. Check the original data source for more information.";
		} else {
			img.alt = "";
		}
	}

	select.addEventListener('change', () => updateDisplayedImage());
	previous.addEventListener('click', () => updateDisplayedImage(-1));
	next.addEventListener('click', () => updateDisplayedImage(1));

	document.addEventListener("keydown", handleKeydown);
	window.addEventListener("message", handleMessage);

	image.addEventListener("load", handleImgLoad);
	image.addEventListener("error", handleImgLoad);

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

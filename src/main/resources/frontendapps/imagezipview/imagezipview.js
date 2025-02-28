(function(){
	const select = document.getElementById('zipimageselect');
	const image =  document.getElementById('multiimagezipframe');
	const urlParams = new URLSearchParams(window.location.search);
	const supportedImages = ['jpg', 'jpeg', 'png'];
	const previous = document.getElementById("previous-button");
	const next = document.getElementById("next-button");
	let zipEntries = [];

	function updateDisplayedImage(step=0) {
		if(zipEntries.length === 0) return;

		// use local idx variable to prevent auto-wrap to 0 on incrementing over bounds
		let idx = select.selectedIndex;
		idx += step;

		// enforce bounds on idx of 0 to zipEntries.length-1
		if(idx < 0) {
			idx = 0;
		} else if (idx >= zipEntries.length) {
			idx = zipEntries.length-1;
		}

		select.selectedIndex = idx;
		
		image.src = zipEntries[idx].path;
			
		// disable/enable previous and next buttons
		previous.disabled = idx <= 0;
		next.disabled = idx >= zipEntries.length - 1;
	}

	select.addEventListener('change', _ => updateDisplayedImage());
	previous.addEventListener('click', _ => updateDisplayedImage(-1));
	next.addEventListener('click', _ => updateDisplayedImage(1));

	// add left/right arrow controls, once inside iframe
	document.addEventListener("keydown", event => {
		if (event.key === "ArrowLeft") {
			updateDisplayedImage(-1);
		  } else if (event.key === "ArrowRight") {
			updateDisplayedImage(1);
		  }
	})

	// fetch contents of zip and build zipEntries for valid extracted files
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
		.then(_ => updateDisplayedImage(), err => console.log(err));
})()

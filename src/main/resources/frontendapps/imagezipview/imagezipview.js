(function(){
	const select = document.getElementById('zipimageselect')
	const image =  document.getElementById('multiimagezipframe')
	const urlParams = new URLSearchParams(window.location.search)
	const supportedImages = ['jpg', 'jpeg', 'png']

	let zipEntries = []

	function selectFile(){
		const idx = select.selectedIndex
		image.src = idx < 0 || idx >= zipEntries.length ? '' : zipEntries[idx].path
	}

	select.addEventListener('change', selectFile)

	fetch(`/zip/${urlParams.get('objId')}/listContents`)
		.then(resp => resp.json())
		.then(json => {
			zipEntries = json.filter(ze => {
				const fileExt = ze.name.split(".").slice(-1)[0].toLowerCase()
				return supportedImages.includes(fileExt)
			})
			select.innerHTML = zipEntries.map((ze,i) => {
				const fname = ze.name.split("/").slice(-1)[0]
				return `<option value=${i}>${fname}</option>`
			}).join('\n')
		})
		.then(_ => selectFile(), err => console.log(err))
})()

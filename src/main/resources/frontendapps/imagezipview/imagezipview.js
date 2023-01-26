(function(){
	const select = document.getElementById('zipimageselect')
	const image =  document.getElementById('multiimagezipframe')
	const urlParams = new URLSearchParams(window.location.search)

	let zipEntries = []

	function selectFile(){
		const imgSource = select.selectedIndex < 0 || select.selectedIndex >= zipEntries.length
			? '' : zipEntries[select.selectedIndex].path
		image.src = imgSource
	}

	select.addEventListener('change', selectFile)

	fetch(`/zip/${urlParams.get('objId')}/listContents`)
		.then(resp => resp.json())
		.then(json => {
			zipEntries = json
			select.innerHTML = json.map((ze,i) => `<option value=${i}>${ze.name}</option>`).join('\n')
		})
		.then(_ => selectFile(), err => console.log(err))
})()

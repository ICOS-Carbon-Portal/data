(function(){

$.when($.ajax("/upload/etc/passwords"), $.ready).then(function(arr){
	initEtcFacadeGui(arr[0].passwords);
});


function initEtcFacadeGui(passwords){

	if(!passwords)
		simpleMessage('You are not logged in. Please log in to see your stations\' passwords, if you are a PI.');

	else if(!passwords.length)
		simpleMessage('You do not appear to be an ecosystem station PI');

	else
		makeControls(passwords);
}


function simpleMessage(msg){
	$(['<p>', msg, '</p>'].join('')).appendTo($('#pipasswords'))
}

function makeControls(passwords){
	$("#pipasswords table").removeAttr('style');

	var $template = $('.stationRow').first();

	var $base = $template.parent();

	passwords.forEach(function(pass){

		var $row = $template.clone();

		$row.appendTo($base);
		$row.find('th').text(pass.station);

		var $pass = $row.find('input')
		$pass.val(pass.password);

		var $button = $row.find('button');

		$button.click(clickHandler($pass, $button));

		$row.removeAttr('style');
	});
}

function clickHandler($pass, $button){
	var show = false;

	return function(){

		show = !show;

		var newType = show ? 'text' : 'password';
		var newBtnText = show ? 'Hide password' : 'Show password';

		$pass.attr('type', newType);
		$button.text(newBtnText);
	};
}

})();

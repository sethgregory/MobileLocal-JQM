/**
 * Mobile Local - Javascript Library
 * 
 * Author  : Seth Gregory
 * Version : 1.0
 * Revised : 2011/02/16
 * 
 */


/*
 * This method tests whether or not the user's browser supports geolocation.
 * 
 * @return boolean
 */
function supports_geolocation(){
    return !!navigator.geolocation;
}

/*
 * This method invokes the getCurrentPosition function and its subsequent
 * success or error callbacks.
 */
function geoLocate() {
	if (supports_geolocation()) {
		// If we can, geolocate!
    	navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
	} else {
		geoError("Something has gone wrong!");
	}
}

/*
 * This method is a callback when a successful geolocation attempt has occurred.
 * It makes a JSONP call via YQL to the Google Reverse Geocoding API.
 * 
 * @param position (object passed from geolocation library)
 */
function geoSuccess(position){
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;    
    var callback = "processGeoData";
	var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%20%3D%20'http%3A%2F%2Fmaps.googleapis.com%2Fmaps%2Fapi%2Fgeocode%2Fjson%3Flatlng%3D"+latitude+"%2C"+longitude+"%26sensor%3Dfalse'&format=json&diagnostics=true&callback="+callback;
	var script = document.createElement('script');
	script.setAttribute('src', url);
	document.getElementsByTagName('head')[0].appendChild(script); 
}

/*
 * This method is a callback function from the JSONP call in geoSuccess().
 * It performs a locationSearch() on the postal code returned in the JSON data object.
 * 
 * @param data (json data object from Google reverse geocoding api)
 */
function processGeoData(data) {
	locationSearch(data.query.results.json.results[0].address_components[7].long_name);
}

/*
 * This method is a callback when an unsuccessful geolocation attempt has occurred.
 * 
 * @param error (string passed from geolocation library)
 */
function geoError(error) {
	// Debug error, commented out.
	/* alert("Error: " + error); */
	// Prettier error for our users.
    alert("Oops, we encountered an error!\n\nWe'll set your location to Boston by default for now.");
    localStorage.previous_locationName = "Boston, MA";
	localStorage.previous_locationId = "02111";
	locationSearch("Boston, MA");
}

/*
 * This method is called via an onSubmit of the location update form.
 * It grabs (and subsequently blanks out) the value of the location text field
 * and then performs a call to locationSearch with it as a parameter
 */
function submitLocationForm() {
	var location = $('#locationfield').val();
	$('#locationfield').val("");
	locationSearch(location);
}

/*
 * This method is the primary entry point for updating the news and weather locations.
 * It takes a location as entered by a user (in either ZIP code or text format) and makes a 
 * JSONP call to a Yahoo community YQL table, weather.search, to retrieve what we will use 
 * as canonical forms of the location data.
 * 
 * @param address (string)
 */
function locationSearch(address) {
	var callback = "processLocationSearch";
	var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.search%20where%20query%3D%22"+encodeURI(address)+"%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback="+callback;
	var script = document.createElement('script');
	script.setAttribute('src', url);
	document.getElementsByTagName('head')[0].appendChild(script);
}

/*
 * This method is a callback function from the JSONP call in locationSearch().
 * It verifies that a successful result set was returned, and alerts the user if
 * the location could not be resolved.  If successful, it retrieves both the text
 * version of the found location, as well as a unique identifier or postal code.
 * Once it has these, it can initiate other asynchronous calls to getWeather(), 
 * getNews(), and addToHistory().
 * 
 * @param data (json data object from Yahoo weather.search table query)
 */
function processLocationSearch(data) {
	if(data.query.results == null) {
		// This is not a valid location
		alert("Sorry, not a valid location!");
		if(localStorage.weatherDataTemp != undefined) {
			$('#weatherdata').html(localStorage.weatherDataTemp);
			localStorage.weatherDataTemp = undefined;
		}
	} else {
		// Everything is cool, let's process our data!		
		var firstresult = data.query.results.loc; 
		if(firstresult.length != null) firstresult = firstresult[0];
		var locationName = firstresult.content;
		if(locationName.indexOf(" (") > 0) {
			locationName = locationName.slice(0, locationName.indexOf(" ("));
		}
		var locationId = firstresult.id;
		
		getWeather(locationId);
		getNews(locationName);
		addToHistory(locationName, locationId);
		
		// It seems like these are the classes to add to auto-collapse my collapsible
		// div headings on the search page, but I assume I need to somehow kick it to
		// make the page reload the dom 
		$('#search_header').addClass('ui-collapsible-heading-collapsed');
		$('#previous_header').addClass('ui-collapsible-heading-collapsed');

	}
}

/*
 * This method performs a query against the Yahoo weather.forecast YQL table, given
 * a canonically-formatted location id from the weather.search table.
 * 
 * @param locationId (string)
 */
function getWeather(locationId) {
	var callback = "processWeatherData";
	var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20location%3D%22" + locationId + "%22&format=json&diagnostics=true&callback="+ callback; // URL of the external script
	var script = document.createElement('script');
	script.setAttribute('src', url);
	document.getElementsByTagName('head')[0].appendChild(script); 
}

/*
 * This method is a callback function from the JSONP call in getWeather().
 * From the data result of the weather query, it parses out the icon, the location
 * name as returned by Yahoo, and the current temperature.  It then sets the innerHTML
 * of the element with id #weatherdata to a string containing all these data elements.
 * 
 * @param data (json data object from Yahoo weather.forecast table query)
 */
function processWeatherData(data) {
	var result = data.query.results.channel;
	var icon = result.item.description.substring(0, result.item.description.indexOf("<b>Current"));
	var location = result.title.substring(17);
	$('#weatherdata').html(icon + "<b>" + location + "</b><br>\n" + data.query.results.channel.item.condition.text + ", " + data.query.results.channel.item.condition.temp + "&deg; F<br>\n<br>\n");
}

/*
 * This method performs a JSONP call via YQL query to Google News, given a 
 * canonically-formatted location name as returned from the weather.search table.
 * 
 * @param locationName (string)
 */
function getNews(locationName) {
	var callback = "processNewsData";
	var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20rss%20where%20url%20%3D%20'http%3A%2F%2Fnews.google.com%2Fnews%3Fgeo%3D"+encodeURIComponent(encodeURI(locationName))+"%26output%3Drss'&format=json&diagnostics=true&callback="+callback;
	var script = document.createElement('script');
	script.setAttribute('src', url);
	document.getElementsByTagName('head')[0].appendChild(script);
}

/*
 * This method is a callback function from the JSONP call in getNews().
 * From each result row returned from the Google News query, it parses out the title
 * and link, and builds an html string from them comprising an unordered list.  It then
 * sets the innerHTML of the block identified by #newsitems. 
 * 
 * Unfortunately, due to issues with the current state of the (alpha) JQuery Mobile 
 * library and its functions for DOM refresh, the CSS classes for the ul and li elements
 * are hard-coded here, resulting in ugly (and difficult to maintain) code.
 * 
 * @param data (json data object from Google News query) 
 */
function processNewsData(data) {
	var htmlchunk="<ul data-role=\"listview\" data-theme=\"c\" class=\"ui-listview\" role=\"listbox\">";
	for(var i=0; i<data.query.results.item.length; i++){
		htmlchunk +="<li role=\"option\" tabindex=\"0\" data-theme=\"c\" class=\"ui-btn ui-btn-icon-right ui-li ui-btn-down-c ui-btn-up-c\">" +
					"<div class=\"ui-btn-inner\"><div class=\"ui-btn-text\">" +
					"<a href=\""+data.query.results.item[i].link+"\" class=\"ui-link-inherit\">"+data.query.results.item[i].title+"</a></div>" +
					"<span class=\"ui-icon ui-icon-arrow-r\"></span></div></li>\n";
		
	}
	htmlchunk += "</ul>";
	
	$('#newsitems').html(htmlchunk);
}


/*
 * This method takes a canonically-formatted locationName and locationId with
 * the intent of adding it to the search history as the most recent (current)
 * location.  It interacts with localStorage and saves this history as a
 * serialized string, exploding it as needed into an array so that it can step
 * through and maintain a limited history in the manner of a FIFO queue.
 * 
 * It also creates an html string (with the same explicit css/dom limitations 
 * as mentioned above in processNewsData()) and sets the innerHTML of the block
 * element identified by #previouslocations
 * 
 * @param locationName (string)
 * @param locationId (string)
 */
function addToHistory(locationName, locationId) {
	// In case there is no history array, create it now.
	if(localStorage.locationHistory == undefined){
		localStorage.locationHistory = locationName+":"+locationId;
	}

	// Split the string into an array to iterate over
	var locationArray = localStorage.locationHistory.split("|");
	localStorage.locationHistory = locationName+":"+locationId;

	// Set previous locationName and locationId
	localStorage.previous_locationName = locationName;
	localStorage.previous_locationId = locationId;
	
	var htmlchunk = '<a href="#main" onClick="locationSearch(\''+locationName+'\');" role="button" aria-label="submit" data-theme="c" class="ui-btn ui-btn-corner-all ui-shadow ui-btn-up-c"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-text">&laquo; '+locationName+' &raquo;</span></span></a>';
	for(var i=0; i<locationArray.length; i++) {
		// Split the current item locationName:locationId into discrete strings
		var currentItem = locationArray[i].split(":");
		
		if(i>5) {
			// Do nothing, truncate the history.
		}
		else if(currentItem[0] != locationName){
			localStorage.locationHistory += "|" + locationArray[i];
			htmlchunk += '<a href="#main" onClick="locationSearch(\''+currentItem[0]+'\');" role="button" aria-label="submit" data-theme="c" class="ui-btn ui-btn-corner-all ui-shadow ui-btn-up-c"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-text">'+currentItem[0]+'</span></span></a>';
		} 
	}
	$('#previouslocations').html(htmlchunk);
	
}

/*
 * This method is a short and sweet one.  It uses a jquerymobile function to change
 * the current page back to the #main div.  It looked neater in the onSubmit.
 */
function navigateHome() {
	$.mobile.changePage("#main", "slide", false, true);
} 

/*
 * This method clears the location history, retaining only the most recent location.
 */
function clearHistory() {
	var locationArray = localStorage.locationHistory.split("|");
	var firstItem = locationArray[0].split(":");
	localStorage.locationHistory = firstItem[0]+":"+firstItem[1];
	addToHistory(firstItem[0], firstItem[1]);
}

/*
 * This method replaces the weather data with a progress image to let the user know
 * some action is taking place.  It uses local storage to store the current html of the
 * weather data, since we don't know if the newly submitted location is valid yet, and we
 * might need to put things back the way they were.
 */
function ajaxSpinner() {
	localStorage.weatherDataTemp = $('#weatherdata').html();
	$('#weatherdata').html("<img src=\"ajax-loader.gif\" alt=\"loading...\"><br>\n<br>\n");
}

/*
 * On page ready, if there is no previous location name in the history, the app tries 
 * to geolocate if possible.
 */
$(document).ready(function() {
		//localStorage.clear();
		if(localStorage.previous_locationName == undefined) {
			// First run.  Using Geolocation if possible.
			geoLocate();
		} else locationSearch(localStorage.previous_locationName);		
});

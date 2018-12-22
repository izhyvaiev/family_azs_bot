const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const getPrices = (body, name) => {
	const dom = new JSDOM(body);
	dom.window.document.querySelectorAll("table.zebra tr table").forEach(table => table.deleteRow(0));
	const trs = dom.window.document.querySelectorAll("table.zebra tr");
	let parsePrice = false;
	let wog = null, okko = null, shell = null, socar = null, glusco = null
	for(const {cells} of trs) {
		if (!parsePrice) {
			if (cells.length === 1) {
				if (cells[0].textContent.toLowerCase().includes(name)) {
					parsePrice = true;
				}
			}
		} else {
			if (cells.length === 1) {
				break;
			}
			if (cells.length !== 7) {
				continue;
			}
			const brand = cells[0].textContent.toLowerCase();
			const price = parseFloat(cells[2].textContent.replace(',','.'))
			switch(brand) {
				case 'wog':
					wog = price;
					break;
				case 'shell':
					shell = price;
					break;
				case 'окко':
					okko = price;
					break;
				case 'glusco':
					glusco = price;
					break;
				case 'socar':
					socar = price;
					break;
			}
		}
	}

	return {wog, okko, shell, socar, glusco};
}

const distance = (lat1, lon1, lat2, lon2) => {
	const p = 0.017453292519943295;    // Math.PI / 180
	const c = Math.cos;
	const a = 0.5 - c((lat2 - lat1) * p)/2 +
		c(lat1 * p) * c(lat2 * p) *
		(1 - c((lon2 - lon1) * p))/2;

	return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

const mapDistance = (response, location) => {
	return response.map(result => ({
		...result,
		distance: Math.round(distance(
			location.lat,
			location.lng,
			result.geometry.location.lat,
			result.geometry.location.lng,
		) * 10) / 10,
	})).sort((a, b) => a.distance - b.distance);
}

const chainLocations = (ctx, locations) => new Promise(resolve => {
	if (locations.length) {
		const {geometry: {location: {lat, lng}}} = locations.pop();
		return ctx.replyWithLocation(lat, lng).then(() => chainLocations(ctx, locations).then(resolve));
	} else {
		return resolve();
	}
})

const filterSameLocations = locations => {
	const lastLatLng = {lat: 0, lng: 0};
	return locations.filter(({geometry: {location: {lat, lng}}}) => {
		const distances = distance(lastLatLng.lat, lastLatLng.lng, lat, lng);
		lastLatLng.lat = lat;
		lastLatLng.lng = lng;
		console.log({distances});
		return distances > 0.01;
	})
}

module.exports = {getPrices, mapDistance, chainLocations, filterSameLocations};
const Telegraf = require('telegraf');
const session = require('telegraf/session');
const fetch = require('node-fetch');
const {getPrices, mapDistance, chainLocations, filterSameLocations} = require('./functions')
const googleMapsClient = require('@google/maps').createClient({
	key: process.env.MAPS_KEY,
	Promise
});
const models = require('./models/index');
const Op = require('sequelize').Op;
const moment = require('moment-timezone');
const bot = new Telegraf(process.env.BOT_KEY);
const filterFunction = ({types}) => types.includes('administrative_area_level_1');


bot.start((ctx) => ctx.reply('Отправь локацию'))
bot.help((ctx) => ctx.reply('Отправь локацию'))
bot.use(session());
bot.on('location', (ctx) => {
	const {update: {message: {from, chat, location: {latitude, longitude}}}} = ctx;
	const location = {lat: latitude, lng: longitude};

	return googleMapsClient.reverseGeocode({
		latlng: location,
		language: 'RU'
	}).asPromise().then((response) => {
		const {long_name} = response.json.results.filter(filterFunction)[0]
			.address_components.filter(filterFunction)[0];

		const name = long_name.replace(/город\s|\sобласть/, '').toLowerCase();

		return fetch('https://index.minfin.com.ua/markets/fuel/detail/')
			.then(res => res.text())
			.then(res => getPrices(res, name))
			.then(prices => {
				models.azs.findAll({
					include: [{
						model: models.discount,
						as: 'discounts',
						required: false,
						where: {
							'end_date': {
								[Op.gte]: moment().tz('Europe/Kiev').format('YYYY-MM-DD')
							},
							[Op.and]: {
								'start_date': {
									[Op.lte]: moment().tz('Europe/Kiev').format('YYYY-MM-DD')
								}
							}
						}
					}]
				}).then(azs => {
					for (const station of azs) {
						station.discounts.forEach(({amount}) => {
							prices[station.code] -= amount;
						});
					}
					const promises = [];
					let brands = Object.keys(prices).sort(function(a,b){return prices[a]-prices[b]});
					for (const brand of brands) {
						promises.push(googleMapsClient.places({
							query: brand,
							type: 'gas_station',
							location,
							language: 'RU',
						}).asPromise().then(response => response.json.results));
					}
					ctx.session.brands = {};
					return Promise.all(promises).then(locations => {
						let text = '';
						for (const i in brands) {
							if (locations[i] !== null) {
								const brandLocations =  mapDistance(locations[i], location);
								const {distance} = brandLocations[0];
								const brand = brands[i];
								const j = parseInt(i) + 1;
								ctx.session.brands[j] = {
									image: azs.find(({code}) => code === brand).qrCodeImage,
									discounts: azs.find(({code}) => code === brand).discounts,
									locations: brandLocations
								};
								text += `${j}) ${brand.toUpperCase()} ${prices[brand].toFixed(2)} ${distance}км\n`;
							}
						}

						return ctx.reply(text)
					})
				});
			});
	})
	.catch((err) => {
		console.log(err);
	});
});

bot.hears(/^\d+$/, (ctx) => {
	const id = parseInt(ctx.update.message.text);
	if (ctx.session.brands){
		const brand = ctx.session.brands[id];
		chainLocations(ctx, filterSameLocations(brand.locations).slice(0, 3)).then(() => {
			ctx.replyWithPhoto({source: `./images/${brand.image}`}).then(() =>
				Promise.all(
					brand.discounts.map(({amount, description}) => ctx.reply(`-${amount}грн, ${description}`))
				).then(() => {

				})
			)
		})
	} else {
		ctx.reply('Отправь локацию')
	}
})
bot.startPolling();
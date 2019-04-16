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
const keyboardMarkup = {
	reply_markup: {
		keyboard: [[{text: "Отправить локацию", request_location: true}]],
		resize_keyboard: true,
	}
};

bot.start((ctx) => ctx.reply('Отправь локацию', keyboardMarkup))
bot.help((ctx) => ctx.reply('Отправь локацию', keyboardMarkup))
bot.use(session());
bot.on('location', (ctx) => {
	const {update: {message: {from: {id}, location: {latitude, longitude}}}} = ctx;
	const location = {lat: latitude, lng: longitude};
	const user = (id === 144005044 ? 'Ivan' : 'Dasha');

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
							},
							[Op.and]: {
								'user': {
									[Op.in]: ['All', user]
								}
							}
						}
					}]
				}).then(azs => {
					for (const station of azs) {
						if (station.discounts.length > 0) {
							let cumulativeDiscountAmount = 0,
								exclusiveDiscountAmount = 0,
								exclusiveDiscount = null;
							station.discounts.forEach(discount => {
								const {amount, exclusive} = discount;
								if (!exclusive) {
									cumulativeDiscountAmount +=  parseFloat(amount)
								} else if (amount > exclusiveDiscountAmount) {
									exclusiveDiscountAmount = parseFloat(amount);
									exclusiveDiscount = discount;
								}
							});

							if (cumulativeDiscountAmount > exclusiveDiscountAmount) {
								for (let fuelType of Object.keys(prices[station.code])) {
									prices[station.code][fuelType] -= cumulativeDiscountAmount;
									station.discounts = station.discounts.filter(({exclusive}) => !exclusive);
								}
							} else {
								for (let fuelType of Object.keys(prices[station.code])) {
									prices[station.code][fuelType] -= exclusiveDiscountAmount;
									station.discounts = [exclusiveDiscount];
								}
							}
						}
					}
					const promises = [];
					let brands = Object.keys(prices).sort(function(a,b){return prices[a].premium-prices[b].premium});
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
						const markup = [];
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
								markup.push([
									{text: brand.toUpperCase(), callback_data: j},
									{text: prices[brand].premium.toFixed(2), callback_data: j},
									{text: typeof prices[brand].regular !== 'undefined'
											? prices[brand].regular.toFixed(2) : '-',
										callback_data: j},
									{text: distance + "км", callback_data: j},
								]);
							}
						}

						return ctx.reply("Выберите АЗС", {
							reply_markup: {
								inline_keyboard: markup,
							}
						})
					});
				});
			});
	})
	.catch((err) => {
		console.log(err);
	});
});
bot.on('callback_query', (ctx) => {
	const id = parseInt(ctx.callbackQuery.data);
	ctx.answerCbQuery()
	if (ctx.session.brands){
		const brand = ctx.session.brands[id];
		chainLocations(ctx, filterSameLocations(brand.locations).slice(0, 3)).then(() => {
			ctx.replyWithPhoto({source: `./images/${brand.image}`}).then(() =>
				Promise.all(
					brand.discounts.map(({amount, description}) => ctx.reply(`-${amount}грн, ${description}`))
				)
			)
		})
	} else {
		ctx.reply('Отправь локацию', keyboardMarkup)
	}
})
bot.hears(/^.*$/, (ctx) => {
	console.log(ctx.update.message.text);
})
bot.startPolling();
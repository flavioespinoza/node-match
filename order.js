const log = require('ololog').configure({locate: false})
const chance = require('chance').Chance()
const Client = require('node-rest-client').Client
const client = new Client()

// const url = 'https://api.gdax.com/products/btc-usd/book'
const url = 'https://min-api.cryptocompare.com/data/histominute?fsym=EMC2&tsym=BTC&limit=20&aggregate=1&e=bittrex'

/** First In, First Out */
function __timestamp () {
  return (new Date).getTime()
}


const Order = async function (type, side, order) {

  let timestamp = __timestamp()

  return new Promise(function (resolve) {

    client.get(url, async function (data) {

      if (order.params.oid) {
        order.params.oid = order.params.oid + '_' + timestamp
      }

      const state = {
        id: chance.guid({version: 5}),
        type,
        side,
        timestamp,
        data: data.Data[0]
      }

      resolve(await Object.assign({}, state, order))

    })

  })

};

const BuyLimit = async function (price, amount, params) {

  try {

    let order = {
      price,
      amount,
      params
    }

    return await Order('buy', 'limit', order)
      .then(async function (order_res) {

        return order_res

      })
      .catch(function (err) {
        log.lightYellow('CATCH:', err)
      })

  } catch (__err) {

    log.lightYellow(__err)

  }

};

const SellLimit = async function (price, amount, params) {

  try {

    let order = {
      price,
      amount,
      params
    }

    return await Order('sell', 'limit', order)
      .then(async function (order_res) {

        return order_res

      })
      .catch(function (err) {
        log.lightYellow('CATCH:', err)
      })

  } catch (__err) {

    log.lightYellow(__err)

  }

};


(async function () {

  let buy_order = await BuyLimit(100, 30, {oid: 'stimpy_' + chance.hash({length: 8})})
  log.lightBlue(JSON.stringify(buy_order, null, 2))

  let sell_order = await SellLimit(100, 30, {oid: 'ren_' + chance.hash({length: 8})})
  log.lightRed(JSON.stringify(sell_order, null, 2))

})()
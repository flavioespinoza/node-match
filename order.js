const express = require('express')
const app = express()
const fs = require('fs')

const log = require('ololog').configure({locate: false})
const _ = require('lodash')

const chance = require('chance').Chance()
const Client = require('node-rest-client').Client
const client = new Client()

// const url = 'https://api.gdax.com/products/btc-usd/book'
const url = 'https://min-api.cryptocompare.com/data/histominute?fsym=EMC2&tsym=BTC&limit=20&aggregate=1&e=bittrex'

// app.get('/listUsers', function (req, res) {
//   fs.readFile(__dirname + '/' + 'order_book.json', 'utf8', function (err, data) {
//     console.log(data)
//     res.end(data)
//   })
// })

console.log(__dirname)

let bids_update = []
let asks_update = []

function tail_recursive (amount, running_total = 0) {

  if (amount === 0) {
    return running_total
  } else {
    return tail_recursive(amount - running_total, running_total + amount)
  }

}

const match_sell_order = async function (order) {

  log.lightRed(JSON.stringify(order, null, 2))

  let bids = []

  return new Promise(async function (resolve, reject) {
    fs.readFile(__dirname + '/' + 'order_book.json', 'utf8', function (err, data) {

      let obj = JSON.parse(data)

      bids = _.sortBy(_.map(obj.bids, function (obj) {
        obj.id = chance.first()
        obj.remaining = obj.amount
        obj.status = 'open'
        return obj
      }), function (obj) {
        return -(obj.price)
      })

      let qty = order.amount

      if (order.side === 'sell') {

        for (let i = 0; i < bids.length; i++) {

          if (bids[i].price < order.price) {

            reject(order)

          } else {

            log.green(i, ': ', JSON.stringify(bids[i], null, 2))

            log.lightBlue(qty)

            if (order.price < bids[i].price) {
              if (qty <= 0) {
                log.black(JSON.stringify(qty, null, 2))
                return bids

              } else if (qty === bids[i].amount) {
                qty = 0
                log.cyan(JSON.stringify(qty, null, 2))
                bids[i].remaining = 0
                bids[i].status = 'filled'

              } else if (qty > bids[i].amount) {
                qty = (_.subtract(qty, bids[i].amount)).toFixed(6)
                log.red(qty)
                bids[i].remaining = 0
                bids[i].status = 'filled'

              } else if (qty < bids[i].amount) {
                bids[i].remaining = (bids[i].amount - qty).toFixed(6)
                bids[i].status = 'partial'
                qty = (qty - bids[i].amount).toFixed(6)
                log.magenta(qty)
                // log.cyan(JSON.stringify(bids, null, 2))
                resolve({bids: bids, order: order})
              }
            }



          }

        }

      }

    })

  })

};

(async function () {
  let qty = 1.5
  let sell_order = await SellLimit(9649, qty, {oid: 'ren_' + chance.hash({length: 8})})
  match_sell_order(sell_order)
    .then(function (resolved) {
      log.red(JSON.stringify(resolved, null, 2))
    })
    .catch(function (rejected) {
      log.black(JSON.stringify(rejected, null, 2))
    })

})()


/** Transaction Functions */
function __timestamp () {
  return (new Date).getTime()
}

async function Order (side, type, order) {

  let timestamp = __timestamp()

  const state = {
    id: chance.guid({version: 5}),
    type,
    side,
    timestamp
  }

  return new Promise(async function (resolve) {

    if (order.params.oid) {
      order.params.oid = order.params.oid + '_' + timestamp
    }

    resolve(await Object.assign({}, state, order))

  })

}

async function BuyLimit (price, amount, params) {

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

}

async function SellLimit (price, amount, params) {

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

}

// (async function () {
//
//   let buy_order = await BuyLimit(100, 30, {oid: 'stimpy_' + chance.hash({length: 8})})
//   log.lightBlue(JSON.stringify(buy_order, null, 2))
//
//
//
// })()

//
// const server = app.listen(8081, function () {
//
//   const host = server.address().address
//   const port = server.address().port
//
//   console.log('Example app listening at http://%s:%s', host, port)
//
// })
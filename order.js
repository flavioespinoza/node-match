const express = require('express')
const app = express()
const fs = require('fs')
const log = require('ololog').configure({
  locate: false
})
const _ = require('lodash')
const chance = require('chance').Chance()
const Client = require('node-rest-client').Client
const client = new Client()

const url = 'https://min-api.cryptocompare.com/data/histominute?fsym=EMC2&tsym=BTC&limit=20&aggregate=1&e=bittrex'

function __timestamp () {
  return (new Date).getTime()
}

async function match_sell_order(order) {

  log.bright.red('socket.on place_sell_order: ', JSON.stringify(order, null, 2))

  return new Promise(async function(resolve) {

    //TODO: Change to REST Client

    fs.readFile(__dirname + '/' + 'order_book.json', 'utf8', function(err, data) {

      let bids = JSON.parse(data).buys

      // console.log(JSON.stringify(bids, null, 2))

      if (order.side === 'sell') {
        for (let i = 0; i < bids.length; i++) {
          if (order.prc > bids[i].prc) {
            if (order.qty_remaining <= 0) {
              order.status = 'filled'
            } else {
              order.status = 'partial'
            }
            resolve({
              bids: bids,
              order: order,
              where: 'A: (order.prc > bids[i].prc)'
            })
            return // Only iterates as far as order meets match engine conditions
          } else {
            if (order.qty_remaining <= 0) {
              resolve({
                bids: bids,
                order: order,
                where: 'B: (order.qty_remaining <= 0)'
              })
            } else if (order.qty_remaining === bids[i].qty_remaining) {
              order.qty_remaining = order.qty_remaining - bids[i].qty_remaining
              bids[i].qty_remaining = 0
              bids[i].status = 'filled'
              log.cyan(JSON.stringify(order, null, 2))
              resolve({
                bids: bids,
                order: order,
                where: 'C: (order.qty_remaining === bids[i].qty_remaining)'
              })
            } else if (order.qty_remaining > bids[i].qty_remaining) {
              order.qty_remaining = (order.qty_remaining - bids[i].qty_remaining).toFixed(1)
              bids[i].qty_remaining = 0
              bids[i].status = 'filled'
            } else {
              bids[i].qty_remaining = (bids[i].qty_remaining - order.qty_remaining).toFixed(1)
              if (bids[i].qty_remaining <= 0) {
                bids[i].status = 'filled'
              } else {
                bids[i].status = 'partial'
              }
              order.qty_remaining = 0
              order.status = 'filled'
              resolve({
                bids: bids,
                order: order,
                where: 'D: else'
              })
            }
          }
        }

      }

    })

  })

}

async function match_buy_order (order) {

  log.lightBlue(JSON.stringify(order, null, 2))

  return new Promise(async function (resolve) {

    //TODO: Change to REST Client
    fs.readFile(__dirname + '/' + 'order_book.json', 'utf8', function (err, data) {

      let asks = JSON.parse(data).sells

      // console.log(JSON.stringify(asks, null, 2))

      if (order.side === 'buy') {

        for (let i = asks.length - 1; i >= 0; i--) {
          if (order.prc < asks[i].prc) {
            if (order.qty_remaining <= 0) {
              order.status = 'filled'
            } else {
              order.status = 'partial'
            }
            resolve({
              asks: asks,
              order: order,
              where: 'A: (order.prc > asks[i].prc)'
            })
            return // Only iterates as far as order meets match engine conditions
          } else {
            if (order.qty_remaining <= 0) {
              resolve({
                asks: asks,
                order: order,
                where: 'B: (order.qty_remaining <= 0)'
              })
            } else if (order.qty_remaining === asks[i].qty_remaining) {
              order.qty_remaining = order.qty_remaining - asks[i].qty_remaining
              asks[i].qty_remaining = 0
              asks[i].status = 'filled'
              log.cyan(JSON.stringify(order, null, 2))
              resolve({
                asks: asks,
                order: order,
                where: 'C: (order.qty_remaining === asks[i].qty_remaining)'
              })
            } else if (order.qty_remaining > asks[i].qty_remaining) {
              order.qty_remaining = (order.qty_remaining - asks[i].qty_remaining).toFixed(1)
              asks[i].qty_remaining = 0
              asks[i].status = 'filled'
            } else {
              asks[i].qty_remaining = (asks[i].qty_remaining - order.qty_remaining).toFixed(1)
              if (asks[i].qty_remaining <= 0) {
                asks[i].status = 'filled'
              } else {
                asks[i].status = 'partial'
              }
              order.qty_remaining = 0
              order.status = 'filled'
              resolve({
                asks: asks,
                order: order,
                where: 'D: else'
              })
            }
          }
        }

      }

    })

  })

}

async function place_sell_order (sell_order) {

  match_sell_order(sell_order)
    .then(function (resolved) {

      /** Bids */
      log.lightBlue(JSON.stringify(resolved.bids, null, 2)) //TODO: Remove
      for (let i = 0; i < resolved.bids.length; i++) {
        if (resolved.bids[i].status === 'filled') {
          log.lightYellow('Remove Order from DB: ', JSON.stringify(resolved.bids[i], null, 2))
        } else if (resolved.bids[i].status === 'partial') {
          log.black('Update Order on DB: ', JSON.stringify(resolved.bids[i], null, 2))
        }
      }

      /** Order */
      if (resolved.order.qty === resolved.order.qty_remaining) {
        resolved.order.status = 'open'
        log.black('Send Sell Order to DB: ', JSON.stringify(resolved.order, null, 2))
      } else {
        if (resolved.order.status === 'filled') {
          log.lightYellow('socket.emit sell_order_filled: ', JSON.stringify(resolved.order, null, 2))
        } else {
          log.black('Send Sell Order to DB: ', JSON.stringify(resolved.order, null, 2))
        }
      }

      /** Where */ //TODO: Remove
      log.bright.cyan(JSON.stringify(resolved.where, null, 2))

    })
    .catch(function (err) {
      log.lightYellow('ERROR: ', JSON.stringify(err.message, null, 2))
    })

}

async function place_buy_order (buy_order) {

  match_buy_order(buy_order)
    .then(function (resolved) {

      /** Asks */
      log.lightRed(JSON.stringify(resolved.asks, null, 2)) //TODO: Remove
      for (let i = 0; i < resolved.asks.length; i++) {
        if (resolved.asks[i].status === 'filled') {
          log.lightYellow('Remove Order from DB: ', JSON.stringify(resolved.asks[i], null, 2))
        } else if (resolved.asks[i].status === 'partial') {
          log.black('Update Order on DB: ', JSON.stringify(resolved.asks[i], null, 2))
        }
      }

      /** Order */
      if (resolved.order.qty === resolved.order.qty_remaining) {
        resolved.order.status = 'open'
        log.black('Send Buy Order to DB: ', JSON.stringify(resolved.order, null, 2))
      } else {
        if (resolved.order.status === 'filled') {
          log.bright.blue('socket.emit buy_order_filled: ', JSON.stringify(resolved.order, null, 2))
        } else {
          log.black('Send Buy Order to DB: ', JSON.stringify(resolved.order, null, 2))
        }
      }

      /** Where */ //TODO: Remove
      log.bright.cyan(JSON.stringify(resolved.where, null, 2))

    })
    .catch(function (err) {
      log.lightYellow('ERROR place_buy_order: ', JSON.stringify(err.message, null, 2))
    })

}

// (async function () {
//   let symbol = 'BTC/USD'
//
//   // let qty = 1.8
//   // let qty = 2.1
//   let qty = 3.5
//
//   // let prc = 9080
//   let prc = 9110
//
//   let sell_order = await SellLimit(symbol, prc, qty)
//   await place_sell_order(sell_order)
//
// })();

(async function () {

  let symbol = 'BTC/USD'
  // let qty = 1.3
  // let qty = 2.1
  let qty = 3.5

  // let prc = 9100
  let prc = 9130

  let buy_order = await BuyLimit(symbol, prc, qty)
  await place_buy_order(buy_order)

})()

/** Transaction Functions */
async function Order (side, type, order) {
  const state = {
    oid: chance.first(),
    id: chance.guid(),
    timestamp: __timestamp(),
    type,
    side
  }
  return new Promise(async function (resolve) {
    resolve(await Object.assign({}, state, order))
  })
}

async function SellLimit (symbol, prc, qty) {
  try {
    let order = {
      symbol,
      prc,
      qty,
      qty_remaining: qty,
      status: 'open'
    }
    return await Order('sell', 'limit', order).then(async function (order_res) {
      return order_res
    }).catch(function (err) {
      log.lightYellow('.catch() SellLimit: ', err.message)
    })
  } catch (__err) {
    log.lightYellow('try catch SellLimit: ', __err.message)
  }
}

async function BuyLimit (symbol, prc, qty) {
  try {
    let order = {
      symbol,
      prc,
      qty,
      qty_remaining: qty,
      status: 'open'
    }
    return await Order('buy', 'limit', order).then(async function (order_res) {
      return order_res
    }).catch(function (err) {
      log.lightYellow('.catch() BuyLimit: ', err.message)
    })
  } catch (__err) {
    log.lightYellow('try catch BuyLimit: ', __err.message)
  }
}

// const server = app.listen(8081, function () {
//
//   const host = server.address().address
//   const port = server.address().port
//
//   console.log('Example app listening at http://%s:%s', host, port)
//
// })
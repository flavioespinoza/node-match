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

function __timestamp () {
  return (new Date).getTime()
}

async function match_sell_order(order) {

  log.lightRed(JSON.stringify(order, null, 2))

  let bids = []

  return new Promise(async function (resolve) {

    //TODO: Change to REST Client
    fs.readFile(__dirname + '/' + 'order_book.json', 'utf8', function (err, data) {

      bids = JSON.parse(data).bids

      // console.log(JSON.stringify(bids, null, 2))

      if (order.side === 'sell') {

        for (let i = 0; i < bids.length; i++) {

          if (order.prc > bids[i].prc) {

            if (order.qty_remaining <= 0) {
              order.status = 'filled'
            } else {
              order.status = 'partial'
            }

            resolve({bids: bids, order: order, where: 'A: (order.prc > bids[i].prc)'})

          } else {

            if (order.qty_remaining <= 0) {

              resolve({bids: bids, order: order, where: 'B: (order.qty_remaining <= 0)'})

            } else if (order.qty_remaining === bids[i].qty_remaining) {

              order.qty_remaining = order.qty_remaining - bids[i].qty_remaining

              bids[i].qty_remaining = 0
              bids[i].status = 'filled'

              log.cyan(JSON.stringify(order, null, 2))

              resolve({bids: bids, order: order, where: 'C: (order.qty_remaining === bids[i].qty_remaining)'})

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
              resolve({bids: bids, order: order, where: 'D: else'})

            }

          }

        }

      }

    })

  })

}

async function place_sell_order(sell_order) {

  match_sell_order(sell_order)
    .then(function (resolved) {

      for (let i = 0; i < resolved.bids.length; i++) {
        if (resolved.bids[i].status === 'filled') {
          log.lightYellow('Remove Order from DB: ', JSON.stringify(resolved.bids[i], null, 2))
        } else if (resolved.bids[i].status === 'partial') {
          log.black('Update Order on DB: ', JSON.stringify(resolved.bids[i], null, 2))
        }
      }

      log.lightBlue(JSON.stringify(resolved.bids, null, 2))

      log.lightRed(JSON.stringify(resolved.order, null, 2))
      if (resolved.order.status === 'filled') {
        log.lightYellow('socket.emit sell_order_filled: ', JSON.stringify(resolved.order, null, 2))
      } else {
        log.black('Send Sell Order to DB: ', JSON.stringify(resolved.order, null, 2))
      }

      log.bright.cyan(JSON.stringify(resolved.where, null, 2))

    })
    .catch(function (rejected) {
      log.black('Rejected: ', JSON.stringify(rejected, null, 2))
    })
}

(async function () {

  let qty = 1.8
  // let qty = 2.1
  // let qty = 3.5

  let sell_order = await SellLimit(9080, qty)
  await place_sell_order(sell_order)

})()

/** Transaction Functions */
async function Order (side, type, order) {

  const state = {
    id: 'Ren',
    type,
    side,
  }

  return new Promise(async function (resolve) {

    resolve(await Object.assign({}, state, order))

  })

}

async function SellLimit (prc, qty) {

  try {

    let order = {
      prc,
      qty,
      qty_remaining: qty,
      status: 'open',
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

async function BuyLimit (prc, qty) {

  try {

    let order = {
      prc,
      qty,
      qty_remaining: qty,
      status: 'open',
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


// const server = app.listen(8081, function () {
//
//   const host = server.address().address
//   const port = server.address().port
//
//   console.log('Example app listening at http://%s:%s', host, port)
//
// })
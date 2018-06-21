const log = require('ololog').configure({locate: false})
const chance = require('chance').Chance()

/** First In, First Out */
function __timestamp () {
  return (new Date).getTime()
}

function __utc () {
  return new Date().toJSON().toString()
}

const Order = (type, side, order) => {

  const state = {
    id: chance.guid({version: 5}),
    type,
    side,
  }

  return Object.assign({}, state, order)

}

const BuyLimit = function (price, amount, params) {
  let order = {
    price,
    amount,
    params,
  }
  return Order('buy', 'limit', order)
}

let buy_order = BuyLimit(100, 30, {oid: 'Stimpy', timestamp: __timestamp()})

log.lightBlue(JSON.stringify(buy_order, null, 2))


const SellLimit = function (price, amount, params) {
  let order = {
    price,
    amount,
    params,
  }
  return Order('buy', 'limit', order)
}
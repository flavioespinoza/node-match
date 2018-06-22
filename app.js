const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const sassMiddleware = require('node-sass-middleware')

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')

const log = require('ololog').configure({locate: false})
const _ = require('lodash')

const Chance = require('chance')
const chance = new Chance()

const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-find'))
const db = new PouchDB('order_book')

const app = express()

function __timestamp () {
  return (new Date).getTime()
}

async function db_put_order (order) {

  return new Promise(async function (resolve) {
    db.put(order)
      .then(async function (res) {

        res._id = res.id
        let placed_order = await db_get_order(res)
        let obj = Object.assign({ok: true}, placed_order)
        log.lightYellow(JSON.stringify(obj, null, 2))

        resolve(obj)

      })
      .catch(function (err) {

        log.lightYellow('ERROR db_put_order(): ', err.message)

        let error = {
          ok: false,
          where: 'ERROR @ db_put_order()',
          message: err.message
        }

        resolve(error)

      })

  })
}

async function db_update_order (order) {

  return new Promise(async function (resolve) {
    db.get(order._id)
      .then(function (doc) {

        log.lightGray(JSON.stringify(order, null, 2))

        let obj = Object.assign({_rev: doc._rev}, order)
        return db.put(obj)

      })
      .then(async function (res) {

        res._id = res.id
        let updated_order = await db_get_order(res)
        log.lightCyan(JSON.stringify(updated_order, null, 2))

        resolve(updated_order)

      })
      .catch(function (err) {

        log.lightYellow('ERROR @ update_order(): ', err.message)

        let error = {
          ok: false,
          where: 'ERROR @ update_order()',
          message: err.message
        }

        resolve(error)

      })
  })

}

async function db_get_order (order) {

  return new Promise(async function (resolve) {
    db.get(order._id)
      .then(function (doc) {

        let obj = Object.assign({ok: true}, doc)
        log.magenta(JSON.stringify(obj, null, 2))

        resolve(obj)

      })
      .catch(function (err) {

        log.lightYellow('ERROR @ db_get_order(): ', err.message)

        let error = {
          ok: false,
          where: 'ERROR @ db_get_order()',
          message: err.message
        }

        resolve(error)

      })
  })

}

async function db_get_open_orders (side) {
  return new Promise(async function (resolve) {
    db.find({
      selector: {side: {$eq: side}}
    }).then(function (res) {

      let obj = {}

      if (side === 'sell') {
        obj = _.sortBy(res.docs, function (obj) {
          return -(obj.prc)
        })
      } else {
        obj = _.sortBy(res.docs, function (obj) {
          return obj.prc
        })
      }

      resolve(_.filter(obj, function (obj) {
        return obj.status !== 'filled'
      }))

    }).catch(function (err) {

      log.lightYellow('ERROR @ db_get_open_orders(): ', err.message)

      let error = {
        ok: false,
        where: 'ERROR @ db_get_open_orders()',
        message: err.message
      }

      resolve(error)

    })
  })
}

(async function () {

  let __order = {
    '_id': 'd84a74e8-64e0-56e8-98ba-4db37ceaefe0',
    'oid': 'Leticia',
    'timestamp': 1529608688538,
    'side': 'sell',
    'prc': 9130,
    'qty': 0.3,
    'qty_remaining': 0.3,
    'status': 'filled'
  }

  let get_order = await db_get_order(__order)
  log.lightBlue(JSON.stringify(get_order, null, 2))

  let update_order = await db_update_order(__order)
  log.black(JSON.stringify(update_order, null, 2))

  let new_order = {
    "oid": chance.first(),
    "_id": chance.guid(),
    "timestamp": __timestamp(),
    "side": "sell",
    "prc": 9110,
    "qty": 1,
    "qty_remaining": 1,
    "status": "open"
  }

  let put_order = await db_put_order(new_order)
  log.lightGray(JSON.stringify(put_order, null, 2))

  let open_sell_orders = await db_get_open_orders('sell')
  log.blue(JSON.stringify(open_sell_orders, null, 2))

})()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser())
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')

})

module.exports = app

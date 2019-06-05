  self.handler(import errHandle from 'rapid-error-handler'
import omit from 'lodash/omit'
import slug from 'limax'
import Book from './model'

export default function() {
  let self = this

  // get all items
  self.getAll = function(req, res, next) {
    let query = {}
    if(req.query.search) query = {title: new RegExp(self.escapeRegex(req.query.search), 'gi')}
    else if(req.query.read) query.read = req.query.read

    Book.find(query, function(err, books) {
      self.handler(err, next, function() {
        res.send({
          total: books.length,
          books: books.map(function(book) {
            let response = self.bookResponse(book)
            response.request = self.bookUrl(req, book)
            return response
          })
        })
      })
    })
  }

  // post new item
  self.post = function(req, res, next) {
    req.body = self.bookStrict(req.body)
    let book = new Book(req.body)
    let response = self.bookResponse(book)
    response.request = self.bookUrl(req, book)

    book.save(function(err) {
      self.handler(err, next, function() {
        res.status(201).send({
          status: 201,
          message: 'Book has added',
          book: response
        })
      })
    })
  }

  // find one item
  self.find = function(req, res, next) {
    Book.findById(req.params.id, function(err, book) {
      self.handler(err, next, function() {
        if(book) {
          req.book = book
          next()
        } else next(new errHandle.NotFound('Book not found'))
      })
    })
  }

  // get one item
  self.get = function(req, res) {
    let response = self.bookResponse(req.book)
    response.filterByRead = {
      type: 'GET',
      url: `http://${req.headers.host}/book?read=${response.read}`
    }
    res.send({book: response})
  }

  // update an item
  self.patch = function(req, res, next) {
    req.body = self.bookStrict(req.body)
    for(let key in req.body) req.book[key] = req.body[key]

    req.book.save(function(err) {
      self.handler(err, next, function() {
        res.send({
          status: 200,
          message: 'Book has updated',
          book: self.bookResponse(req.book)
        })
      })
    })
  }

  // delete an item
  self.delete = function(req, res, next) {
    req.book.remove(function(err) {
      self.handler(err, next, function() {
        res.send({
          status: 200,
          message: 'Book has removed'
        })
      })
    })
  }


  // handler function
  self.handler = function(err, next, callback) {
    if(err) next(new errHandle.BadRequest(err))
    else callback()
  }

  // book response function
  self.bookResponse = function(book) {
    return {
      _id: book._id,
      title: book.title,
      author: book.author,
      read: book.read,
      slug: book.slug,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt
    }
  }

  // book url function
  self.bookUrl = function(req, book) {
    return {
      type: 'GET',
      url: `http://${req.headers.host}/book/${book._id}`
    }
  }

  // book strict function
  self.bookStrict = function(body) {
    body = omit(body, 'slug')
    if(body.title) body.slug = slug(body.title)
    return omit(body, ['_id', 'createdAt', 'updatedAt', '__v'])
  }

  // escape regex function
  self.escapeRegex = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  }

  return {
    getAll: self.getAll,
    post: self.post,
    find: self.find,
    get: self.get,
    patch: self.patch,
    delete: self.delete
  }
}

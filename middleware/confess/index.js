
'use strict';

var Q = require('q');

/**
* Routes
*/

var routes = [];

/**
* GET /
* Version: 1.0.0
*/


routes.push({
  meta: {
    name: 'getConfessions',
    method: 'GET',
    paths: [
    '/confess'
    ],
    version: '1.0.0',
  },
  middleware: function( req, res, next ) {

    var confess = require('./confess');
    confess.hammer(req.params.url, req.params.concurrency)
      .then(function(confessions) {
        res.send(confessions);
        next();
      });
  }
});


/**
* Export
*/

module.exports = routes;

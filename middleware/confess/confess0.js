var phantom = require('phantom');
var Q = require('q');

var performance = {};
var resources = [];
var result = {};
var phantomjs = {};

var run_phantom = function() {
  var deferred = Q.defer();
  try {
    phantom.create('--load-images=no', function (ph) {
      phantomjs = ph;
        deferred.resolve(ph);
    });
  }
  catch(error) {
    deferred.reject(error);
  }

  return deferred.promise;
}

var init_page = function(phantom) {
  var deferred = Q.defer();
  try {
    phantom.createPage(function (page) {
      /****************************************************
      The following event handlers are taken from
      confess.js @ https://github.com/jamesgpearce/confess
      ****************************************************/
      page.set('onLoadStarted', function(page, config) {
        if (!performance.start) {
          performance.start = new Date().getTime();
        }
      });



      page.set('onResourceRequested', function(request) {
        console.log("REQUESTED:", request.id);
        var now = new Date().getTime();
        resources[request.id] = {
          id: request.id,
          url: request.url,
          request: request,
          responses: {},
          duration: '-',
          times: {
            request: now
          }
        };
        if (!performance.start || now < performance.start) {
          performance.start = now;
        }
      });



      page.set('onResourceReceived', function(response) {
        console.log("RECEIVED:", response.id, response.stage);
        try {
          var now = new Date().getTime(),
          resource = resources[response.id];
          resource.responses[response.stage] = response;
          if (!resource.times[response.stage]) {
            resource.times[response.stage] = now;
            resource.duration = now - resource.times.request;
          }
          if (response.bodySize) {
            resource.size = response.bodySize;
          } else if (!resource.size) {
            response.headers.forEach(function (header) {
              if (header.name.toLowerCase()=='content-length') {
                resource.size = parseInt(header.value);
              }
            });
          }
        }
        catch(Exception) {
          //console.log("Response:", response);
          //console.log("Resources:", this.resources);
        }
      });



      page.set('onLoadFinished', function(status) {
        var start = performance.start,
        finish =  new Date().getTime(),
        slowest, fastest, totalDuration = 0,
        largest, smallest, totalSize = 0,
        missingSize = false,
        elapsed = finish - start;

        resources.forEach(function (resource) {
          if (!resource.times.start) {
            resource.times.start = resource.times.end;
          }
          if (!slowest || resource.duration > slowest.duration) {
            slowest = resource;
          }
          if (!fastest || resource.duration < fastest.duration) {
            fastest = resource;
          }
          totalDuration += resource.duration;

          if (resource.size) {
            if (!largest || resource.size > largest.size) {
              largest = resource;
            }
            if (!smallest || resource.size < smallest.size) {
              smallest = resource;
            }
            totalSize += resource.size;
          } else {
            resource.size = '-';
            missingSize = true;
          }
        });

        var r = {
          elapsedLoadTime   : elapsed,
          totalResources    : resources.length-1,
          fastestResource   : fastest.duration,
          slowestResource   : slowest.duration,
          totalDuration     : totalDuration,
          smallestResource  : smallest.size,
          largetsResource   : largest.size,
          totalSize         : totalSize,
          resources         : []
        }

        resources.forEach(function (resource) {
          r.resources.push({id: resource.id, duration: resource.duration, size: resource.size, url: resource.url});
        });

        result = r;

      });

      deferred.resolve(page);

    });
  }
  catch(error) {
    deferred.reject(error);
  }

  return deferred.promise;
}

var open_page = function(page) {
  var deferred = Q.defer();
  try {
    page.open("http://www.google.com", function (status) {
      deferred.resolve(result);
    });
  }
  catch(error) {
    deferred.reject(error);
  }

  return deferred.promise;
}

var destroy = function() {
  phantomjs.exit();
  //process.kill(phantomjs.process.pid, 'SIGHUP');
  //phantomjs.process.exit();
}

var evaluate = function(url) {
  var deferred = Q.defer();

  run_phantom().then(init_page).then(open_page)
  .then(function(result) {
    deferred.resolve(result);
  })

  return deferred.promise;
}

var hammer = function(url, concurrency) {
  var deferred = Q.defer();
  var promisesToConfess = [];

  for(var i = 0; i < concurrency; i++) {
    promisesToConfess.push(evaluate(url));
  }

  Q.allSettled(promisesToConfess)
  .then(function (results) {
    var confessions = [];

    for(var i = 0; i < results.length; i++) {
      confessions.push(results[i].value);
    }

    deferred.resolve(confessions);
    destroy();
  });

  return deferred.promise;
}

module.exports.hammer = hammer;

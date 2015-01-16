var Browser = require('zombie');
var assert  = require('assert');

var evaluate = function(url) {
  browser = Browser.create();
  browser.visit(url).then(function(a, b, c, d) {
    browser.wait(function() {
      browser.resources.forEach(function(resource) {
        console.log(resource.request.url);
      });  
    })

    //console.log("RESULT:", browser.resources);
  });
}

module.exports.evaluate = evaluate;

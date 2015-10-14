module.exports = require('bdsft-sdk-model')(Request);

var Utils = require('bdsft-sdk-utils');
var jQuery = require('jquery');
// Running in NodeJS
if (typeof window === 'undefined') {
  var domino = require('domino');
  jQuery = require('jquery')(domino.createWindow());
  jQuery.ajaxSettings.xhr = function(){
    var XMLHttpRequest = require('xhr2');
    return new XMLHttpRequest();
  };
}

var Q = require('q');

function Request(debug) {

  return function(){
    var self = {};

    var xhr;
    self.abort = function(){
      xhr && xhr.abort();
    };

    self.send = function(options){
      var url = options.url+options.path;
      if(options.params) {
        url = Utils.addUrlParams(url, options.params);
      }
      var type = options.type || 'GET';
      debug.info(type+' : ' + url+ ' : '+JSON.stringify(options.data));
      var deferred = Q.defer();
      var data = options.dataType === 'json' ? JSON.stringify(options.data) : data;
      var contentType = options.dataType === 'json' ? 'application/json; charset=utf-8' : 'application/x-www-form-urlencoded'
      jQuery.support.cors = true;
      try{
        xhr = jQuery.ajax({
          type: type,
          url: url,
          contentType: contentType,
          data: data || {},
          dataType: options.dataType || 'text',
          cache: options.cache || false,
          crossDomain: true,
          xhrFields: {
            withCredentials: true
          },
          beforeSend: function (xhr) {
            if(options.basic) {
              xhr.setRequestHeader("Authorization", "Basic "+new Buffer(options.basic.user + ':' + options.basic.password).toString('base64'));
            }
            if(options.headers) {
              if(options.headers.Authorization) {
                xhr.setRequestHeader("Authorization", "OAuth "+ options.params.access_token); 
              }
            }
          }
        }).done(function(result){
          debug.log(result);
          deferred.resolve(result);
        }).fail(function(err){
          if(err.statusText !== 'abort') {
            debug.error("error : " + JSON.stringify(err));
            deferred.reject(JSON.stringify(err));
          } else {
            deferred.reject();
          }
        });
      } catch(e) {
        debug.error(JSON.stringify(e));
        deferred.reject(e);
      }
      return deferred.promise;
    };

    return self;
  }
}
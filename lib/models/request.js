module.exports = require('bdsft-sdk-model')(Request);

var Utils = require('bdsft-sdk-utils');
// var jQuery = require('jquery');
// // Running in NodeJS
// if (typeof window === 'undefined') {
//   var domino = require('domino');
//   jQuery = require('jquery')(domino.createWindow());
//   jQuery.ajaxSettings.xhr = function(){
//     var XMLHttpRequest = require('xhr2');
//     return new XMLHttpRequest();
//   };
// }
var superagent = require('superagent');
var Q = require('q');

function Request(debug) {

    return function() {
        var self = {};

        var request;
        self.abort = function() {
            request && request.abort();
        };

        self.agent = function() {
            return superagent.agent && superagent.agent() || superagent;
        };

        self.send = function(options) {
            var url = options.url + options.path;
            if (options.params) {
                url = Utils.addUrlParams(url, options.params);
            }
            var type = options.type || 'GET';
            debug.info(type + ' : ' + url + (options.data ? ' : ' + JSON.stringify(options.data) : ''));
            var deferred = Q.defer();
            var data = options.dataType === 'json' ? JSON.stringify(options.data) : data;
            var contentType;
            if(options.dataType === 'xml') {
                contentType = 'text';
            } else if(options.dataType === 'json'){
                contentType = 'json';
            } else {
                contentType = 'form';
            }
            var agent = options.agent || superagent;
            try {
                request = (agent[type.toLowerCase()] && agent[type.toLowerCase()](url) || agent(type, url)).type(contentType);
                if(request.buffer) {
                    request = request.buffer(true);
                }
                if (data && type.match(/get/i)) {
                    request = request.query(data).withCredentials();
                } else if (data && !type.match(/get/i)) {
                    request = request.send(data).withCredentials();
                }
                if (options.basic) {
                    request = request.set("Authorization", "Basic " + new Buffer(options.basic.user + ':' + options.basic.password).toString('base64'));
                }
                if (options.broadworksSSO) {
                    request = request.set("Authorization", "BroadWorksSSO " + options.broadworksSSO);
                }
                if (options.headers) {
                    if (options.headers.Authorization) {
                        request = request.set("Authorization", "OAuth " + options.params.access_token);
                    }
                }

                request = request.end(function(err, res) {
                    if (res.ok) {
                        debug.log(JSON.stringify(res.text));
                        deferred.resolve(contentType === 'json' ? res.body : res.text);
                    } else {
                        if (err.text !== 'abort') {
                            debug.error("error : " + JSON.stringify(err));
                            deferred.reject(JSON.stringify(err));
                        } else {
                            deferred.reject();
                        }
                    }
                })
            } catch (e) {
                debug.error(e.stack);
                deferred.reject(e);
            }
            return deferred.promise;
        };

        return self;
    }
}
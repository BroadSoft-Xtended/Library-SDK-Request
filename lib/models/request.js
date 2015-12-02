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

        var create = function(options) {
            var url = options.url + (options.path || '');
            if (options.params) {
                url = Utils.addUrlParams(url, options.params);
            }
            var type = options.type || 'GET';
            debug.info(type + ' : ' + url + (options.data ? ' : ' + JSON.stringify(options.data) : ''));
            var data = options.dataType === 'json' ? JSON.stringify(options.data) : data;
            if (options.dataType === 'xml') {
                options.contentType = 'text';
            } else if (options.dataType === 'json') {
                options.contentType = 'json';
            } else {
                options.contentType = 'form';
            }
            var agent = options.agent || superagent;
            try {
                request = (agent[type.toLowerCase()] && agent[type.toLowerCase()](url) || agent(type, url)).type(options.contentType);
                if (request.buffer) {
                    request = request.buffer(true);
                }

                if (data && type.match(/get/i)) {
                    request = request.query(data);
                } else if (data && !type.match(/get/i)) {
                    request = request.send(data);
                }

                if (request.withCredentials) {
                    request = request.withCredentials();
                }

                if (options.cookie) {
                    request = request.set('Cookie', options.cookie);
                    debug.debug('Cookie : ' + options.cookie);
                }

                if (options.basic) {
                    debug.debug('auth basic : ' + options.basic.user);
                    request = request.set("Authorization", "Basic " + new Buffer(options.basic.user + ':' + options.basic.password).toString('base64'));
                }
                if (options.broadworksSSO) {
                    debug.debug('auth broadworksSSO : ' + options.broadworksSSO);
                    request = request.set("Authorization", "BroadWorksSSO " + options.broadworksSSO);
                }
                if (options.headers) {
                    if (options.headers.Authorization) {
                        debug.debug('auth OAuth : ' + (options.params && options.params.access_token));
                        request = request.set("Authorization", "OAuth " + options.params.access_token);
                    }
                }
                return request.redirects(options.redirect || 0);
            } catch (e) {
                debug.error(e.stack);
                throw e;
            }
        };

        self.send = function(options) {
            var deferred = Q.defer();
            var request = create(options);
            var redirects = 0;
            var onEnd = function(err, res) {
                if (res.statusCode === 302 && redirects < 5) {
                    debug.log('redirect to ' + res.get('location'));
                    options.url = res.get('location');
                    options.path = '';
                    create(options).end(onEnd);
                    redirects++;
                    return;
                }
                self.response = res;
                if (res && res.ok) {
                    debug.log(JSON.stringify(res.text));
                    deferred.resolve(options.contentType === 'json' ? res.body : res.text);
                } else {
                    if (err.text !== 'abort') {
                        debug.error("error : " + JSON.stringify(err));
                        deferred.reject(JSON.stringify(err));
                    } else {
                        deferred.reject();
                    }
                }
            };
            request.end(onEnd)
            return deferred.promise;
        };

        return self;
    }
}
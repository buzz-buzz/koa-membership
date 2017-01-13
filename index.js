'use strict';

const util = require('util');
const request = require('co-request');
const url = require('url');
const cookie = require('./cookie');

function parseTokenByMock() {
    return {
        isSuccess: true,
        result: {
            member_id: 'fake member'
        }
    };
}

function redirectToSignInPagae() {
    this.redirect('/sign-in?return_url=' + encodeURIComponent(this.request.originalUrl));
}

function guideToSignInPage() {
    if (this.request.get('X-Request-With') === 'XMLHttpRequest') {
        this.body = {
            isSuccess: false,
            code: 302,
            message: this.headers.referer || '/'
        };
    } else {
        redirectToSignInPagae.call(this);
    }
}

module.exports = function (config) {
    function setUser(context, data) {
        context.state.user = {
            member_id: data.member_id,
            token: data.token,

            isAdmin: config.admins.indexOf(data.member_id) >= 0
        };
    }

    function * setUserByToken(context) {
        let token = context.cookies.get('token');

        let result = yield parseToken(token);

        if (result.isSuccess) {
            setUser(context, {
                member_id: result.result.member_id,
                token: token
            });
        } else {
            delete context.state.user;
        }
    }

    function * parseToken(token) {
        if (token) {
            return config.mock ? parseTokenByMock() : (yield parseTokenBySSO(token)).body;
        } else {
            return {
                isSuccess: false
            }
        }
    }

    function * parseTokenBySSO(token) {
        return yield request({
            uri: 'http://' + config.sso.inner.host + ':' + config.sso.inner.port + '/token/parse',
            json: {token: token},
            method: 'POST'
        });
    }

    return {
        setUserByToken: function *(next) {
            let context = this;
            yield setUserByToken(context);

            yield next;
        },

        setUser: function *(context, data) {
            yield setUser(context, data);
        },

        ensureAuthenticated: function *(next) {
            yield setUserByToken(this);

            if (this.state.user) {
                yield next;
            } else {
                guideToSignInPage.call(this);
            }
        },

        ensureAdmin: function *(next) {
            yield setUserByToken(this);

            if (this.state.user && this.state.user.isAdmin) {
                yield next;
            } else {
                cookie.deleteToken.apply(this);
                redirectToSignInPagae.call(this);
            }
        }
    };
};
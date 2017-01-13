'use strict';

let clearCookieOption = {
    expires: new Date(1970, 1, 1),
    path: '/',
    httpOnly: true
};
let sessionCookieOption = {
    expires: 0,
    path: '/',
    httpOnly: true
};

module.exports = {
    setToken: function (token) {
        this.cookies.set('token', token, sessionCookieOption);
    },
    deleteToken: function () {
        this.cookies.set('token', '', clearCookieOption);
    }
};
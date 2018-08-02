'use strict'
let ethers = require('ethers');
//let SigningKey = ethers.SigningKey;
const EthCrypto = require('eth-crypto');
let Session = require('./session')
let core = require('node-xmpp-core')
let JID = core.JID
let Stanza = core.Stanza
let Element = core.Element
let inherits = core.inherits
let exec = require('child_process').exec
let debug = require('debug')('xmpp:client')
let path = require('path')

let NS_CLIENT = 'jabber:client'
let NS_REGISTER = 'jabber:iq:register'
let NS_AUTH = 'jabber:iq:auth'
let NS_XMPP_SASL = 'urn:ietf:params:xml:ns:xmpp-sasl'
let NS_XMPP_BIND = 'urn:ietf:params:xml:ns:xmpp-bind'
let NS_XMPP_SESSION = 'urn:ietf:params:xml:ns:xmpp-session'

let STATE_PREAUTH = 0
let STATE_AUTH = 1
let STATE_AUTHED = 2
let STATE_BIND = 3
let STATE_SESSION = 4
let STATE_ONLINE = 5

let IQID_SESSION = 'sess'
let IQID_BIND = 'bind'

let decode64, encode64, Buffer
if (typeof btoa === 'undefined') {
    let btoa = null
    let atob = null
}

if (typeof btoa === 'function') {
    decode64 = function (encoded) {
        return atob(encoded)
    }
} else {
    Buffer = require('buffer').Buffer
    decode64 = function (encoded) {
        return (new Buffer(encoded, 'base64')).toString('utf8')
    }
}
if (typeof atob === 'function') {
    encode64 = function (decoded) {
        return btoa(decoded)
    }
} else {
    Buffer = require('buffer').Buffer
    encode64 = function (decoded) {
        return (new Buffer(decoded, 'utf8')).toString('base64')
    }
}

/**
 * params object:
 *   jid: String (required)
 *   password: String (required)
 *   host: String (optional)
 *   port: Number (optional)
 *   reconnect: Boolean (optional)
 *   autostart: Boolean (optional) - if we start connecting to a given port
 *   register: Boolean (option) - register account before authentication
 *   legacySSL: Boolean (optional) - connect to the legacy SSL port, requires at least the host to be specified
 *   credentials: Dictionary (optional) - TLS or SSL key and certificate credentials
 *   actAs: String (optional) - if admin user act on behalf of another user (just user)
 *   disallowTLS: Boolean (optional) - prevent upgrading the connection to a secure one via TLS
 *   preferred: String (optional) - Preferred SASL mechanism to use
 *   bosh.url: String (optional) - BOSH endpoint to use
 *   bosh.prebind: Function(error, data) (optional) - Just prebind a new BOSH session for browser client use
 *            error String - Result of XMPP error. Ex : [Error: XMPP authentication failure]
 *            data Object - Result of XMPP BOSH connection.
 *
 * Examples:
 *   let cl = new xmpp.Client({
 *       jid: "me@example.com",
 *       password: "secret"
 *   })
 *   let gtalk = new xmpp.Client({
 *       jid: 'me@gmail.com',
 *       oauth2_token: 'xxxx.xxxxxxxxxxx', // from OAuth2
 *       oauth2_auth: 'http://www.google.com/talk/protocol/auth',
 *       host: 'talk.google.com'
 *   })
 *   let prebind = new xmpp.Client({
 *       jid: "me@example.com",
 *       password: "secret",
 *       bosh: {
 *           url: "http://example.com/http-bind",
 *           prebind: function(error, data) {
 *               if (error) {}
 *               res.send({ rid: data.rid, sid: data.sid })
 *           }
 *       }
 *   })
 *
 * Example SASL EXTERNAL:
 *
 * let myCredentials = {
 *   // These are necessary only if using the client certificate authentication
 *   key: fs.readFileSync('key.pem'),
 *   cert: fs.readFileSync('cert.pem'),
 *   // passphrase: 'optional'
 * }
 * let cl = new xmppClient({
 *     jid: "me@example.com",
 *     credentials: myCredentials
 *     preferred: 'EXTERNAL' // not really required, but possible
 * })
 *
 */
function Client(options) {


    this.account=new ethers.Wallet(options.privKey);
    //this.account.address=this.account.address.toLowerCase();
    // let signingKey = new SigningKey(options.privKey);
    //this.account.pubKey=SigningKey.getPublicKey(options.privKey, false);
    options.jid=this.account.address+"@"+options.jidhost;
    options.username=this.account.address;
    this.options = options;
    // this.availableSaslMechanisms = [
    //     XOAuth2, External, DigestMD5, Plain, Anonymous
    // ]



    if (this.options.autostart !== false) this.connect()
}

inherits(Client, Session)

Client.NS_CLIENT = NS_CLIENT

Client.prototype.connect = function () {
    if (this.options.bosh && this.options.bosh.prebind) {
        return this._connectViaBosh()
    }
    this._useStandardConnect()
}

Client.prototype._useStandardConnect = function () {
    this.options.xmlns = NS_CLIENT
    delete this.did_bind
    delete this.did_session

    this.state = STATE_PREAUTH
    this.on('end', function () {
        this.state = STATE_PREAUTH
        delete this.did_bind
        delete this.did_session
    })

    Session.call(this, this.options)
    this.options.jid = this.jid

    this.connection.on('disconnect', function (error) {
        this.state = STATE_PREAUTH
        if (!this.connection.reconnect) {
            if (error) this.emit('error', error)
            this.emit('offline')
        }
        delete this.did_bind
        delete this.did_session
    }.bind(this))

    /* If server and client have multiple possible auth mechanisms
     * we try to select the preferred one
     */
    // if (this.options.preferred) {
    //     this.preferredSaslMechanism = this.options.preferred
    // } else {
    //     this.preferredSaslMechanism = 'DIGEST-MD5'
    // }

    // let mechs = sasl.detectMechanisms(this.options, this.availableSaslMechanisms)
    // this.availableSaslMechanisms = mechs
}

Client.prototype._connectViaBosh = function () {
    debug('load bosh prebind')
    let cb = this.options.bosh.prebind
    delete this.options.bosh.prebind
    let cmd = 'node ' + path.join(__dirname, 'prebind.js') + ' ' + encodeURI(JSON.stringify(this.options))
    exec(
        cmd,
        function (error, stdout, stderr) {
            if (error) {
                cb(error, null)
            } else {
                let r = stdout.match(/rid:+[ 0-9]*/i)
                let s = stdout.match(/sid:+[ a-z+'"-_A-Z+0-9]*/i)
                if (!r || !s) {
                    return cb(stderr)
                }
                r = (r[0].split(':'))[1].trim()

                s = (s[0].split(':'))[1]
                    .replace("'", '')
                    .replace("'", '')
                    .trim()
                if (r && s) {
                    return cb(null, {rid: r, sid: s})
                }
                cb(stderr)
            }
        }
    )
}

Client.prototype.onStanza = function (stanza) {
    /* Actually, we shouldn't wait for <stream:features/> if
     * this.streamAttrs.version is missing, but who uses pre-XMPP-1.0
     * these days anyway?
     */
    if (stanza.name === 'stream:error') {
        return this._handleStreamError(stanza)
    }
    if ((this.state !== STATE_ONLINE) && stanza.is('features')) {
        this.streamFeatures = stanza
        return this.useFeatures()
    }
    this._handleStanza(stanza)
}

Client.prototype._handleStanza = function (stanza) {
    switch (this.state) {
        case STATE_ONLINE:
            this.emit('stanza', stanza)
            break
        case STATE_PREAUTH:
            this.emit('stanza:preauth', stanza)
            break
        case STATE_AUTH:
            this._handleAuthState(stanza)
            break
        case STATE_BIND:
            if (stanza.is('iq') && (stanza.attrs.id === IQID_BIND)) {
                this._handleBindState(stanza)
            }
            break
        case STATE_SESSION:
            if ((stanza.is('iq') === true) && (stanza.attrs.id === IQID_SESSION)) {
                this._handleSessionState(stanza)
            }
            break
    }
}

Client.prototype._handleStreamError = function (stanza) {
    if (!this.reconnect) {
        this.emit('error', stanza)
    }
}

Client.prototype._handleSessionState = function (stanza) {
    if (stanza.attrs.type === 'result') {
        this.state = STATE_AUTHED
        this.did_session = true

        /* no stream restart, but next feature (most probably
           we'll go online next) */
        this.useFeatures()
    } else {
        this.emit('error', 'Cannot bind resource')
    }
}

Client.prototype._handleBindState = function (stanza) {
    if (stanza.attrs.type === 'result') {
        this.state = STATE_AUTHED
        this.did_bind = true

        let bindEl = stanza.getChild('bind', NS_XMPP_BIND)
        if (bindEl && bindEl.getChild('jid')) {
            this.jid = new JID(bindEl.getChild('jid').getText())
        }

        /* no stream restart, but next feature */
        this.useFeatures()
    } else {
        this.emit('error', 'Cannot bind resource')
    }
}

Client.prototype._handleAuthState = function (stanza) {
    if (stanza.is('challenge', NS_AUTH)) {
        let challengeMsg = stanza.getText()
        let data = parseDict(challengeMsg);
        let messageHash = EthCrypto.hash.keccak256(data.nonce);
        data.signature = EthCrypto.sign(
            this.account.privateKey, // privateKey
            messageHash // hash of message
        );
        //data.pubKey=this.account.pubKey;
        data.username=this.options.username;
        data.firstname=this.options.firstname;
        data.lastname=this.options.lastname;
        let responseMsg = encodeDict(data);
        let response = new Element('response', {xmlns: NS_AUTH}).t(responseMsg)
        this.send(response)
    } else if (stanza.is('success', NS_AUTH)) {
        this.mech = null
        this.state = STATE_AUTHED
        this.emit('auth')
    } else {
        this.emit('error', 'XMPP authentication failure')
    }
}

function parseDict(s) {
    let result = {}
    while (s) {
        let m
        if ((m = /^(.+?)=(.*?[^\\]),\s*(.*)/.exec(s))) {
            result[m[1]] = m[2].replace(/"/g, '')
            s = m[3]
        } else if ((m = /^(.+?)=(.+?),\s*(.*)/.exec(s))) {
            result[m[1]] = m[2]
            s = m[3]
        } else if ((m = /^(.+?)="(.*?[^\\])"$/.exec(s))) {
            result[m[1]] = m[2]
            s = m[3]
        } else if ((m = /^(.+?)=(.+?)$/.exec(s))) {
            result[m[1]] = m[2]
            s = m[3]
        } else {
            s = null
        }
    }
    return result
}

function encodeDict(dict) {
    let s = ''
    for (let k in dict) {
        let v = dict[k]
        if (v) s += ',' + k + '="' + v + '"'
    }
    return s.substr(1) // without first ','
}

Client.prototype._handlePreAuthState = function () {
    this.state = STATE_AUTH
    // let offeredMechs = this.streamFeatures.getChild('mechanisms', NS_XMPP_SASL).getChildren('mechanism', NS_XMPP_SASL).map(function (el) { return el.getText() })
    // this.mech = sasl.selectMechanism(
    //   offeredMechs,
    //   this.preferredSaslMechanism,
    //   this.availableSaslMechanisms
    // )
    // if (this.mech) {
    //   this.mech.authzid = this.jid.bare().toString()
    //   this.mech.authcid = this.jid.local
    //   this.mech.password = this.password
    //   this.mech.api_key = this.api_key
    //   this.mech.access_token = this.access_token
    //   this.mech.oauth2_token = this.oauth2_token
    //   this.mech.oauth2_auth = this.oauth2_auth
    //   this.mech.realm = this.jid.domain // anything?
    //   if (this.actAs) this.mech.actAs = this.actAs.user
    //   this.mech.digest_uri = 'xmpp/' + this.jid.domain
    //   let authMsg = encode64(this.mech.auth())
    //   let attrs = this.mech.authAttrs()
    let attrs = {};
    attrs.xmlns = NS_AUTH;
    // attrs.username = this.account.username;
    //attrs.mechanism = this.mech.name
    this.send(new Element('auth', attrs).t(this.account.address))
    // } else {
    //   this.emit('error', new Error('No usable SASL mechanism'))
    // }
};

/**
 * Either we just received <stream:features/>, or we just enabled a
 * feature and are looking for the next.
 */
Client.prototype.useFeatures = function () {
    if (this.state === STATE_PREAUTH) {
        this._handlePreAuthState()
    } else if ((this.state === STATE_AUTHED) &&
        !this.did_bind &&
        this.streamFeatures.getChild('bind', NS_XMPP_BIND)) {
        this.state = STATE_BIND
        let bindEl = new Stanza('iq', {
            type: 'set',
            id: IQID_BIND
        }).c('bind', {xmlns: NS_XMPP_BIND})
        if (this.jid.resource) {
            bindEl.c('resource').t(this.jid.resource)
        }
        this.send(bindEl)
    } else if ((this.state === STATE_AUTHED) &&
        !this.did_session &&
        this.streamFeatures.getChild('session', NS_XMPP_SESSION)) {
        this.state = STATE_SESSION
        let stanza = new Stanza('iq', {
            type: 'set',
            to: this.jid.domain,
            id: IQID_SESSION
        }).c('session', {xmlns: NS_XMPP_SESSION})
        this.send(stanza)
    } else if (this.state === STATE_AUTHED) {
        /* Ok, we're authenticated and all features have been
           processed */
        this.state = STATE_ONLINE
        this.emit('online', {jid: this.jid})
    }
}

// Client.prototype.doRegister = function () {
//     let id = 'register' + Math.ceil(Math.random() * 99999)
//     let iq = new Stanza('iq', {
//         type: 'set',
//         id: id,
//         to: this.jid.domain
//     }).c('query', {xmlns: NS_REGISTER})
//         .c('username').t(this.jid.local).up()
//         .c('password').t(this.password)
//     this.send(iq)
//
//     let self = this
//     let onReply = function (reply) {
//         if (reply.is('iq') && (reply.attrs.id === id)) {
//             self.removeListener('stanza', onReply)
//
//             if (reply.attrs.type === 'result') {
//                 /* Registration successful, proceed to auth */
//                 self.useFeatures()
//             } else {
//                 self.emit('error', new Error('Registration error'))
//             }
//         }
//     }
//     this.on('stanza:preauth', onReply)
// }

/**
 * returns all registered sasl mechanisms
 */
Client.prototype.getSaslMechanisms = function () {
    return this.availableSaslMechanisms
}

/**
 * removes all registered sasl mechanisms
 */
Client.prototype.clearSaslMechanism = function () {
    this.availableSaslMechanisms = []
}

/**
 * register a new sasl mechanism
 */
// Client.prototype.registerSaslMechanism = function (method) {
//     // check if method is registered
//     if (this.availableSaslMechanisms.indexOf(method) === -1) {
//         this.availableSaslMechanisms.push(method)
//     }
// }

/**
 * unregister an existing sasl mechanism
 */
// Client.prototype.unregisterSaslMechanism = function (method) {
//     // check if method is registered
//     let index = this.availableSaslMechanisms.indexOf(method)
//     if (index >= 0) {
//         this.availableSaslMechanisms = this.availableSaslMechanisms.splice(index, 1)
//     }
// }

module.exports = Client

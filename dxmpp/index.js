var xmpp = require('./node-xmpp-client');
var Stanza = xmpp.Stanza;
var EventEmitter = require('events').EventEmitter;
//let util = require('util');
var qbox = require('qbox');
var crypto = require('crypto');
var dif = require('js-x25519');
var helpers = require('../crypt/helpers.js');
var STATUS = {
    AWAY: "away",
    DND: "dnd",
    XA: "xa",
    ONLINE: "online",
    OFFLINE: "offline"
};
var vcard = {
    FN: 'name',
    TYPE: 'avatar_type',
    BINVAL: 'avatar',
    DESC: 'bio',
    GIVEN: 'firstname',
    FAMILY: 'lastname',
    ADR: 'id',
    DOM: 'domain',
};
var NS_CHATSTATES = "http://jabber.org/protocol/chatstates";
var NS_ROOMSTATES = "http://jabber.org/protocol/muc";
var NS_DISCSTATES = "http://jabber.org/protocol/disco#items";
var NS_vCARDSTATES = "vcard-temp";
var NS_CHATEVSTATES = "http://jabber.org/protocol/muc#event";
var Dxmpp = /** @class */ (function () {
    function Dxmpp() {
        // this.config=config;
        this.events = new EventEmitter();
        this.$ = qbox.create();
    }
    Dxmpp.getInstance = function () {
        if (!Dxmpp.instance) {
            Dxmpp.instance = new Dxmpp();
        }
        return Dxmpp.instance;
    };
    // let self = this;
    // let config;
    // let client;
    // let probeBuddies = {};
    // let joinedRooms = {};
    // let capabilities = {};
    // let capBuddies = {};
    // let iqCallbacks = {};
    // let $ = qbox.create();
    Dxmpp.prototype.take_time = function () {
        var now = new Date();
        return now.getHours() + ":" + now.getMinutes();
    };
    ;
    Dxmpp.parse_vcard = function (data, element) {
        element.children.forEach(function (element) {
            var el = vcard[element.name];
            if (el) {
                data[el] = element.text();
            }
            if (element.children) {
                data = Dxmpp.parse_vcard(data, element);
            }
            return data;
        });
        return data;
    };
    Dxmpp.hexEncode = function (str) {
        var hex, i;
        var result = "";
        for (i = 0; i < str.length; i++) {
            hex = str.charCodeAt(i).toString(16);
            result += ("000" + hex).slice(-4);
        }
        return result;
    };
    Dxmpp.hexDecode = function (str) {
        var j;
        var hexes = str.match(/.{1,4}/g) || [];
        var back = "";
        for (j = 0; j < hexes.length; j++) {
            back += String.fromCharCode(parseInt(hexes[j], 16));
        }
        return back;
    };
    Dxmpp.generateSecret = function (mypriv, buddypub) {
        return helpers.toHexString(dif.getSharedKey(mypriv, buddypub));
    };
    Dxmpp.prototype.encryptMsg = function (msg, secret) {
        // let first = crypto.createECDH('secp256k1');
        // first.generateKeys();
        // let priv1=first.getPrivateKey();
        // let pub1 = dif.getPublic(priv1);
        // first.generateKeys();
        // let priv2=first.getPrivateKey();
        // let pub2 = dif.getPublic(priv2);
        // secret = Dxmpp.generateSecret(priv1, pub2);
        return helpers.encryptText(secret, msg);
        // console.log("Encrypted: ", enc);
        // let denc = helpers.decryptText(secret, enc);
        // console.log("Decrypted: ", denc);
    };
    Dxmpp.decryptMsg = function (msg, secret) {
        return helpers.decryptText(secret, msg);
    };
    // let events = new EventEmitter();
    Dxmpp.prototype.on = function (event, callback) {
        this.events.on(event, callback);
    };
    ;
    Dxmpp.prototype.removeListener = function (args) {
        this.events.removeListener.apply(this.events, Array.prototype.slice.call(args));
    };
    ;
    Dxmpp.prototype.get_contacts = function () {
        var _this = this;
        this.$.ready(function () {
            var roster = new Stanza('iq', { id: 'roster_0', type: 'get' });
            roster.c('query', { xmlns: 'jabber:iq:roster' });
            _this.client.send(roster);
        });
    };
    ;
    Dxmpp.prototype.acceptSubscription = function (user, pub_key) {
        var _this = this;
        var test = "I am a test pubKey!";
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: user.id + "@" + user.domain, type: 'subscribed' });
            stanza.c("pubKey").t(test);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.subscribe = function (user, pub_key) {
        var _this = this;
        var test = "I am a test pubKey!";
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: user.id + "@" + user.domain, type: 'subscribe' });
            stanza.c("pubKey").t(test);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.send = function (user, message, id, group, secret) {
        var _this = this;
        message = Dxmpp.encryptMsg(message, secret);
        this.$.ready(function () {
            var stanza = new Stanza('message', { from: _this.client.options.jid, to: user.id + "@" + user.domain, type: (group ? 'groupchat' : 'chat') });
            stanza.c('id').t(id);
            stanza.c('body').t(message);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.join = function (room, password) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: room.id + "@" + room.domain }).c('x', { xmlns: NS_ROOMSTATES });
            // XEP-0045 7.2.6 Password-Protected Rooms
            if (password != null && password != "")
                stanza.c('password').t(password);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.register_room = function (name, password) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: name, channel: '0' }).c('x', { xmlns: NS_ROOMSTATES });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.register_channel = function (channel, password) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: Dxmpp.hexEncode(channel.name) + "@" + channel.domain, channel: '1' }).
                c('x', { xmlns: NS_ROOMSTATES });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.find_group = function (part_of_name) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('iq', { from: _this.client.options.jid,
                to: _this.client.options.host, id: "123", type: "get",
                name: Dxmpp.hexEncode(part_of_name) }).c('query', { xmlns: NS_DISCSTATES });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.set_vcard = function (firstname, lastname, bio, img) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('iq', { id: "v2", type: "set" })
                .c('vCard', { xmlns: NS_vCARDSTATES })
                .c('FN').t(firstname + " " + lastname).up()
                .c('ADR').t(_this.client.options.username).up()
                .c('DOM').t(_this.client.options.jidhost).up()
                .c('N')
                .c('FAMILY').t(lastname).up()
                .c('GIVEN').t(firstname).up()
                .c('MIDDLE').up().up();
            if (bio) {
                stanza.c('DESC').t(bio).up();
            }
            if (img) {
                stanza.c('PHOTO')
                    .c('TYPE').t("image/jpeg").up()
                    .c('BINVAL').t(img).up().up();
            }
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.get_vcard = function (user) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('iq', { id: "v3", to: user.id + "@" + user.domain, type: "get" })
                .c('vCard', { xmlns: NS_vCARDSTATES });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.invite = function (user, room, reason) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('message', { from: _this.client.options.jid, to: room }).c('x', { xmlns: NS_ROOMSTATES + '#user' }).c('invite', { to: user.id + "@" + user.domain });
            if (reason)
                stanza.c('reason').t(reason);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.send_suggesstion = function (user, text) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('iq', { id: 'suggest', from: _this.client.options.jid, to: user.id + "@" + user.domain, type: 'set' })
                .c('x', { xmlns: NS_ROOMSTATES + '#event' })
                .c('item', { type: 'suggestion', group: user.id + "@" + user.domain }).t(text);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.get_address = function () {
        if (this.client) {
            return this.client.options.username;
        }
        else {
            return undefined;
        }
    };
    ;
    Dxmpp.prototype.disconnect = function () {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, type: 'unavailable' });
            stanza.c('status').t('Logged out');
            _this.client.send(stanza);
            var ref = _this.client.connection;
            if (ref.socket.writable) {
                if (ref.streamOpened) {
                    ref.socket.write('</stream:stream>');
                    delete ref.streamOpened;
                }
                else {
                    ref.socket.end();
                }
            }
        });
    };
    ;
    Dxmpp.get_room_data = function (stanza) {
        var name = undefined;
        var host = undefined;
        var id = undefined;
        if (stanza.attrs.from.indexOf('/') !== -1) {
            var shit = stanza.attrs.from.split('/');
            name = shit[1];
            shit = shit[0];
            var shit2 = shit.split('@');
            id = shit2[0];
            host = shit2[1];
        }
        else {
            var shit2 = stanza.attrs.from.split('@');
            id = shit2[0];
            host = shit2[1];
        }
        return { id: id, host: host, name: name };
    };
    // this.parse_jid = function (jid) {
    //     let x, y, z;
    //     let shit = stanza.attrs.from.split('/');
    //     z = shit[1];
    //     shit = shit[0];
    //     shit = shit.split('@');
    //     x = shit[0];
    //     y = shit[1];
    //     return {x,y,z}
    // };
    Dxmpp.prototype.connect = function (config) {
        var _this = this;
        this.config = config;
        this.client = new xmpp.Client(this.config);
        this.client.on('close', function () {
            _this.$.stop();
            _this.events.emit('close');
        });
        this.client.on('online', function (data) {
            _this.client.send(new Stanza('presence'));
            _this.events.emit('online', data);
            _this.$.start();
            // keepalive
            if (_this.client.connection.socket) {
                _this.client.connection.socket.setTimeout(0);
                _this.client.connection.socket.setKeepAlive(true, 10000);
            }
        });
        this.client.on('stanza', function (stanza) {
            _this.events.emit('stanza', stanza);
            //console.log(stanza);
            //looking for message stanza
            if (stanza.is('message')) {
                //getting the chat message
                if (stanza.attrs.type == 'chat') {
                    var body = stanza.getChild('body');
                    if (body) {
                        var message = body.getText();
                        var from = stanza.attrs.from;
                        var id = from.split('/')[0];
                        var bla = id.split("@");
                        var user = { id: bla[0], domain: bla[1] };
                        _this.events.emit('chat', user, message);
                    }
                    var chatstate = stanza.getChildByAttr('xmlns', NS_CHATSTATES);
                    if (chatstate) {
                        _this.events.emit('chatstate', stanza.attrs.from, chatstate.name);
                    }
                }
                else if (stanza.attrs.type == 'groupchat') {
                    var body = stanza.getChild('body');
                    if (body) {
                        var message = body.getText();
                        var stamp = null;
                        var sender = null;
                        if (stanza.getChild('x') && stanza.getChild('x').attrs.stamp)
                            stamp = stanza.getChild('x').attrs.stamp;
                        if (stanza.attrs.sender) {
                            sender = stanza.attrs.sender;
                            if (sender.split('/')) {
                                sender = sender.split('/')[0];
                            }
                            sender = sender.split('@');
                            sender = { address: sender[0], domain: sender[1] };
                        }
                        _this.events.emit('groupchat', Dxmpp.get_room_data(stanza), message, sender, stamp);
                    }
                }
            }
            else if (stanza.is('presence')) {
                var from = stanza.attrs.from;
                if (from) {
                    var id = from.split('/')[0];
                    var resource = from.split('/')[1];
                    var bla = id.split("@");
                    var user = { id: bla[0], domain: bla[1] };
                    if (stanza.attrs.type == 'subscribe') {
                        //handling incoming subscription requests
                        _this.events.emit('subscribe', user);
                    }
                    else if (stanza.attrs.type == 'unsubscribe') {
                        //handling incoming unsubscription requests
                        _this.events.emit('unsubscribe', user);
                    }
                    else {
                        //looking for presence stenza for availability changes
                        var statusText = stanza.getChildText('status');
                        if (stanza.getChild('x')) {
                            var x_elem = stanza.getChild('x');
                            if (x_elem.attrs.xmlns === NS_ROOMSTATES + '#user') {
                                var room_data = Dxmpp.get_room_data(stanza);
                                if (x_elem.getChild('item') && x_elem.getChild('item').attrs.role) {
                                    var item_elem = x_elem.getChild('item');
                                    var role = item_elem.attrs.role;
                                    var avatar = stanza.attrs.avatar;
                                    var channel = stanza.attrs.channel;
                                    // let contractaddress = stanza.attrs.contractaddress;
                                    var room_data_full = { id: room_data.id, name: Dxmpp.hexDecode(room_data.name), domain: room_data.host, role: role, channel: channel, avatar: avatar };
                                    //joinedRooms[room_data.id] = room_data;
                                    _this.events.emit('joined_room', room_data_full);
                                    return;
                                }
                                else {
                                    bla = stanza.attrs.user_joined.split("@");
                                    user = { id: bla[0], domain: bla[1] };
                                    _this.events.emit('user_joined_room', user, room_data);
                                    return;
                                }
                            }
                        }
                        var state = (stanza.getChild('show')) ? stanza.getChild('show').getText() : STATUS.ONLINE;
                        state = (state == 'chat') ? STATUS.ONLINE : state;
                        state = (stanza.attrs.type == 'unavailable') ? STATUS.OFFLINE : state;
                        _this.events.emit('buddy', user, state, statusText, resource);
                    }
                }
            }
            else if (stanza.is('iq')) {
                if (stanza.getChild('ping', 'urn:xmpp:ping')) {
                    _this.client.send(new Stanza('iq', { id: stanza.attrs.id, to: stanza.attrs.from, type: 'result' }));
                }
                else if (stanza.attrs.type === 'result') {
                    var card = stanza.getChild('vCard', NS_vCARDSTATES);
                    if (card) {
                        var data = {};
                        _this.events.emit('received_vcard', Dxmpp.parse_vcard(data, card));
                    }
                    var query = stanza.getChild('query', NS_DISCSTATES);
                    if (query) {
                        var resda_1 = [];
                        query.getChildren("item").forEach(function (element) {
                            element.attrs.name = Dxmpp.hexDecode(element.attrs.name);
                            resda_1.push(element.attrs);
                        });
                        _this.events.emit("find_groups", resda_1);
                    }
                    query = stanza.getChild('confirmation', NS_DISCSTATES);
                    if (query) {
                        var resda = query.getChildren("item");
                        _this.events.emit("confirmation", resda[0].attrs);
                    }
                }
                else {
                    if (stanza.getChild('x')) {
                        var id = stanza.attrs.from.split('/')[0];
                        // console.log(id);
                        var x_elem = stanza.getChild('x');
                        if (x_elem.attrs.xmlns === NS_ROOMSTATES + '#event') {
                            var item_elem = x_elem.getChild('item');
                            switch (item_elem.attrs.type) {
                                case "suggestion":
                                    var bla = id.split('@');
                                    var group_data = item_elem.attrs.group.split('@');
                                    var user = { id: bla[0], domain: bla[1] };
                                    _this.events.emit('post_suggested', {
                                        user: user,
                                        group: { id: group_data[0], domain: group_data[1] },
                                        text: item_elem.getText()
                                    });
                                    break;
                            }
                            return;
                        }
                    }
                }
            }
        });
        this.client.on('error', function (err) {
            _this.events.emit('error', err);
        });
    };
    ;
    return Dxmpp;
}());
module.exports = Dxmpp;

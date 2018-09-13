var xmpp = require('./node-xmpp-client');
var Stanza = xmpp.Stanza;
var EventEmitter = require('events').EventEmitter;
//let util = require('util');
var qbox = require('qbox');
var STATUS = {
    AWAY: "away",
    DND: "dnd",
    XA: "xa",
    ONLINE: "online",
    OFFLINE: "offline"
};
var vcard = {
    FN: 'full_name',
    TYPE: 'avatar_type',
    BINVAL: 'avatar',
    DESC: 'bio',
    GIVEN: 'firstname',
    FAMILY: 'lastname',
    ADR: 'address',
    DOM: 'domain',
};
var NS_CHATSTATES = "http://jabber.org/protocol/chatstates";
var NS_ROOMSTATES = "http://jabber.org/protocol/muc";
var NS_DISCSTATES = "http://jabber.org/protocol/disco#items";
var NS_vCARDSTATES = "vcard-temp";
var Dxmpp = /** @class */ (function () {
    function Dxmpp(config) {
        this.config = config;
        this.events = new EventEmitter();
        this.$ = qbox.create();
    }
    Dxmpp.getInstance = function (config) {
        if (!Dxmpp.instance) {
            Dxmpp.instance = new Dxmpp(config);
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
    Dxmpp.take_time = function () {
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
    Dxmpp.prototype.acceptSubscription = function (to) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: to, type: 'subscribed' });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.subscribe = function (to) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: to, type: 'subscribe' });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.send = function (to, message, group) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('message', { from: _this.client.options.jid, to: to, type: (group ? 'groupchat' : 'chat') });
            stanza.c('body').t(message);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.join = function (to, password) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: to }).c('x', { xmlns: NS_ROOMSTATES });
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
    Dxmpp.prototype.register_channel = function (name, domain, contractaddress, password) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('presence', { from: _this.client.options.jid, to: Dxmpp.hexEncode(name) + "@" + domain, contractaddress: contractaddress, channel: '1' }).
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
    Dxmpp.prototype.get_vcard = function (to) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('iq', { id: "v3", to: to, type: "get" })
                .c('vCard', { xmlns: NS_vCARDSTATES });
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.invite = function (to, room, reason) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('message', { from: _this.client.options.jid, to: room }).c('x', { xmlns: NS_ROOMSTATES + '#user' }).c('invite', { to: to });
            if (reason)
                stanza.c('reason').t(reason);
            _this.client.send(stanza);
        });
    };
    ;
    Dxmpp.prototype.send_suggesstion = function (to, text) {
        var _this = this;
        this.$.ready(function () {
            var stanza = new Stanza('iq', { id: 'suggest', from: _this.client.options.jid, to: to, type: 'set' })
                .c('x', { xmlns: NS_ROOMSTATES + '#event' })
                .c('item', { type: 'suggestion', group: to }).t(text);
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
    Dxmpp.prototype.connect = function () {
        var _this = this;
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
                        _this.events.emit('chat', id, message);
                    }
                    var chatstate = stanza.getChildByAttr('xmlns', NS_CHATSTATES);
                    if (chatstate) {
                        // Event: chatstate
                        //
                        // Emitted when an incoming <message/> with a chatstate notification
                        // is received.
                        //
                        // Event handler parameters:
                        //   jid   - the JID this chatstate noticiation originates from
                        //   state - new chatstate we're being notified about.
                        //
                        // See <SimpleXMPP#setChatstate> for details on chatstates.
                        //
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
                    if (stanza.attrs.type == 'subscribe') {
                        //handling incoming subscription requests
                        _this.events.emit('subscribe', from);
                    }
                    else if (stanza.attrs.type == 'unsubscribe') {
                        //handling incoming unsubscription requests
                        _this.events.emit('unsubscribe', from);
                    }
                    else {
                        //looking for presence stenza for availability changes
                        var id = from.split('/')[0];
                        var resource = from.split('/')[1];
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
                                    var contractaddress = stanza.attrs.contractaddress;
                                    var room_data_full = { id: room_data.id, name: Dxmpp.hexDecode(room_data.name), domain: room_data.host, contractaddress: contractaddress, role: role, channel: channel, avatar: avatar };
                                    //joinedRooms[room_data.id] = room_data;
                                    _this.events.emit('joined_room', room_data_full);
                                    return;
                                }
                                else {
                                    var bla = stanza.attrs.user_joined.split("@");
                                    var user = { username: bla[0], domain: bla[1] };
                                    _this.events.emit('user_joined_room', user, room_data);
                                    return;
                                }
                            }
                        }
                        var state = (stanza.getChild('show')) ? stanza.getChild('show').getText() : STATUS.ONLINE;
                        state = (state == 'chat') ? STATUS.ONLINE : state;
                        state = (stanza.attrs.type == 'unavailable') ? STATUS.OFFLINE : state;
                        //checking if this is based on probe
                        // if (probeBuddies[id]) {
                        //     events.emit('probe_' + id, state, statusText);
                        //     delete probeBuddies[id];
                        // } else {
                        //     //specifying roster changes
                        //     if (joinedRooms[id]) {
                        //         let groupBuddy = from.split('/')[1];
                        //         events.emit('groupbuddy', id, groupBuddy, state, statusText);
                        //     } else {
                        //         events.emit('buddy', id, state, statusText, resource);
                        //     }
                        // }
                        _this.events.emit('buddy', id, state, statusText, resource);
                        // Check if capabilities are provided
                        // let caps = stanza.getChild('c', 'http://jabber.org/protocol/caps');
                        // if (caps) {
                        //     let node = caps.attrs.node,
                        //         ver = caps.attrs.ver;
                        //
                        //     if (ver) {
                        //         let fullNode = node + '#' + ver;
                        //         // Check if it's already been cached
                        //         if (capabilities[fullNode]) {
                        //             this.events.emit('buddyCapabilities', id, capabilities[fullNode]);
                        //         } else {
                        //             // Save this buddy so we can send the capability data when it arrives
                        //             if (!capBuddies[fullNode]) {
                        //                 capBuddies[fullNode] = [];
                        //             }
                        //             capBuddies[fullNode].push(id);
                        //
                        //             let getCaps = new Stanza('iq', {id: 'disco1', to: from, type: 'get'});
                        //             getCaps.c('query', {
                        //                 xmlns: 'http://jabber.org/protocol/disco#info',
                        //                 node: fullNode
                        //             });
                        //             this.client.send(getCaps);
                        //         }
                        //     }
                        // }
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
                    var query = stanza.getChild('query', 'http://jabber.org/protocol/disco#items');
                    if (query) {
                        var resda_1 = [];
                        query.getChildren("item").forEach(function (element) {
                            element.attrs.name = element.attrs.name.hexDecode();
                            resda_1.push(element.attrs);
                        });
                        // let result = query.getChildren("item").map(child => child.attrs);
                        // result.forEach(function (element) {
                        //     for (let attr in element){
                        //         if (attr==='name') {
                        //             re
                        //         }
                        //     }
                        // });
                        _this.events.emit("find_groups", resda_1);
                    }
                }
                // Response to capabilities request?
                // else if (stanza.attrs.id === 'disco1') {
                //     let query = stanza.getChild('query', 'http://jabber.org/protocol/disco#info');
                //
                //     // Ignore it if there's no <query> element - Not much we can do in this case!
                //     if (!query) {
                //         return;
                //     }
                //
                //     let node = query.attrs.node,
                //         identity = query.getChild('identity'),
                //         features = query.getChildren('feature');
                //
                //     let result = {
                //         clientName: identity && identity.attrs.name,
                //         features: features.map(function (feature) {
                //             return feature.attrs['let'];
                //         })
                //     };
                //
                //     // capabilities[node] = result;
                //     //
                //     // // Send it to all buddies that were waiting
                //     // if (capBuddies[node]) {
                //     //     capBuddies[node].forEach(function (id) {
                //     //         events.emit('buddyCapabilities', id, result);
                //     //     });
                //     //     delete capBuddies[node];
                //     // }
                // }
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
                // let cb = iqCallbacks[stanza.attrs.id];
                // if (cb) {
                //     cb(stanza);
                //     delete iqCallbacks[stanza.attrs.id];
                // }
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

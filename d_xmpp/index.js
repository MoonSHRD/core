let xmpp = require('./node-xmpp-client');
let Stanza = xmpp.Stanza;
let EventEmitter = require('events').EventEmitter;
//let util = require('util');
let qbox = require('qbox');

let STATUS = {
    AWAY: "away",
    DND: "dnd",
    XA: "xa",
    ONLINE: "online",
    OFFLINE: "offline"
};

let NS_CHATSTATES = "http://jabber.org/protocol/chatstates";
let NS_ROOMSTATES = "http://jabber.org/protocol/muc";

function Dxmpp() {

    let self = this;
    let config;
    let client;
    let probeBuddies = {};
    let joinedRooms = {};
    let capabilities = {};
    let capBuddies = {};
    let iqCallbacks = {};
    let $ = qbox.create();


    let events = new EventEmitter();
    this.on = function () {
        events.on.apply(events, Array.prototype.slice.call(arguments));
    };
    this.removeListener = function () {
        events.removeListener.apply(events, Array.prototype.slice.call(arguments));
    };

    this.events = events;

    this.get_contacts = function () {
        $.ready(function () {
            let roster = new Stanza('iq', {id: 'roster_0', type: 'get'});
            roster.c('query', {xmlns: 'jabber:iq:roster'});
            client.send(roster);
        });
    };

    this.acceptSubscription = function (to) {
        $.ready(function () {
            let stanza = new Stanza('presence', {to: to, type: 'subscribed'});
            client.send(stanza);
        });
    };

    this.subscribe = function (to) {
        $.ready(function () {
            let stanza = new Stanza('presence', {to: to, type: 'subscribe'});
            client.send(stanza);
        });
    };

    this.send = function (to, message, group) {
        $.ready(function () {
            let stanza = new Stanza('message', {to: to, type: (group ? 'groupchat' : 'chat')});
            stanza.c('body').t(message);
            client.send(stanza);
        });
    };

    this.join = function (to, password) {

        $.ready(function () {
            let room = to.split('/')[0];
            if (!joinedRooms[room]) {
                joinedRooms[room] = true;
            }
            let stanza = new Stanza('presence', {from:client.options.jid,to: to}).c('x', {xmlns: NS_ROOMSTATES});
            // XEP-0045 7.2.6 Password-Protected Rooms
            if (password != null && password != "")
                stanza.c('password').t(password);
            client.send(stanza);
        });
    };

    this.register_room = function (name, password) {

        $.ready(function () {
            let stanza = new Stanza('presence', {to: name}).c('x', {xmlns: NS_ROOMSTATES});
            client.send(stanza);
        });
    };

    this.invite = function (to, room, reason) {

        $.ready(function () {
            let stanza = new Stanza('message', {to: room}).c('x', {xmlns: NS_ROOMSTATES + '#user'}).c('invite', {to: to});
            if (reason)
                stanza.c('reason').t(reason);
            client.send(stanza);
        });

    };

    this.disconnect = function () {
        $.ready(function () {
            let stanza = new Stanza('presence', {type: 'unavailable'});
            stanza.c('status').t('Logged out');
            client.send(stanza);

            let ref = this.client.connection;
            if (ref.socket.writable) {
                if (ref.streamOpened) {
                    ref.socket.write('</stream:stream>');
                    delete ref.streamOpened;
                } else {
                    ref.socket.end();
                }
            }
        });
    };

    function get_room_data(stanza) {
        let name = undefined;
        let host = undefined;
        let id = undefined;
        if (stanza.attrs.from.indexOf('/') !== -1) {
            let shit = stanza.attrs.from.split('/');
            name = shit[1];
            shit=shit[0];
            let shit2 = shit.split('@');
            id = shit2[0];
            host = shit2[1];
        } else {
            id=stanza.attrs.from.split('@')[0];
            let data = joinedRooms[id];
            name=data.name;
            host=data.host;
        }
        return {id, host, name}
    }

    this.connect = function (params) {

        config = params;
        client = new xmpp.Client(params);
        self.client = client;

        client.on('close', function () {
            $.stop();
            events.emit('close');
        });

        client.on('online', function (data) {
            if (!config.skipPresence) {
                client.send(new Stanza('presence'));
            }
            events.emit('online', data);
            $.start();

            // keepalive
            if (self.client.connection.socket) {
                self.client.connection.socket.setTimeout(0);
                self.client.connection.socket.setKeepAlive(true, 10000);
            }
        });

        client.on('stanza', function (stanza) {
            events.emit('stanza', stanza);
            //console.log(stanza);
            //looking for message stanza
            if (stanza.is('message')) {

                //getting the chat message
                if (stanza.attrs.type == 'chat') {

                    let body = stanza.getChild('body');
                    if (body) {
                        let message = body.getText();
                        let from = stanza.attrs.from;
                        let id = from.split('/')[0];
                        events.emit('chat', id, message);
                    }

                    let chatstate = stanza.getChildByAttr('xmlns', NS_CHATSTATES);
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
                        events.emit('chatstate', stanza.attrs.from, chatstate.name);
                    }

                } else if (stanza.attrs.type == 'groupchat') {

                    let body = stanza.getChild('body');
                    if (body) {
                        let message = body.getText();
                        let stamp = null;
                        let sender = null;
                        if (stanza.getChild('x') && stanza.getChild('x').attrs.stamp)
                            stamp = stanza.getChild('x').attrs.stamp;
                        if (stanza.attrs.sender)
                            sender = stanza.attrs.sender;
                        events.emit('groupchat', joinedRooms[get_room_data(stanza).id], message, sender, stamp);
                    }
                }
            } else if (stanza.is('presence')) {

                let from = stanza.attrs.from;
                if (from) {
                    if (stanza.attrs.type == 'subscribe') {
                        //handling incoming subscription requests
                        events.emit('subscribe', from);
                    } else if (stanza.attrs.type == 'unsubscribe') {
                        //handling incoming unsubscription requests
                        events.emit('unsubscribe', from);
                    } else {
                        //looking for presence stenza for availability changes
                        let id = from.split('/')[0];
                        let resource = from.split('/')[1];
                        let statusText = stanza.getChildText('status');
                        let x_elem = stanza.getChild('x');
                        if (x_elem.attrs.xmlns === NS_ROOMSTATES + '#user') {
                            let room_data = get_room_data(stanza);
                            if (x_elem.getChild('item') && x_elem.getChild('item').attrs.role){
                                let item_elem = x_elem.getChild('item');
                                let role = item_elem.attrs.role;
                                joinedRooms[room_data.id] = {name: room_data.name, host: room_data.host, role: role};
                                events.emit('joined_room', role, room_data)
                            } else {
                                let bla=stanza.attrs.user_joined.split("@");
                                let user = {username:bla[0],domain:bla[1]};
                                events.emit('user_joined_room', user, room_data)
                            }
                        }
                        let state = (stanza.getChild('show')) ? stanza.getChild('show').getText() : STATUS.ONLINE;
                        state = (state == 'chat') ? STATUS.ONLINE : state;
                        state = (stanza.attrs.type == 'unavailable') ? STATUS.OFFLINE : state;
                        //checking if this is based on probe
                        if (probeBuddies[id]) {
                            events.emit('probe_' + id, state, statusText);
                            delete probeBuddies[id];
                        } else {
                            //specifying roster changes
                            if (joinedRooms[id]) {
                                let groupBuddy = from.split('/')[1];
                                events.emit('groupbuddy', id, groupBuddy, state, statusText);
                            } else {
                                events.emit('buddy', id, state, statusText, resource);
                            }
                        }

                        // Check if capabilities are provided
                        let caps = stanza.getChild('c', 'http://jabber.org/protocol/caps');
                        if (caps) {
                            let node = caps.attrs.node,
                                ver = caps.attrs.ver;

                            if (ver) {
                                let fullNode = node + '#' + ver;
                                // Check if it's already been cached
                                if (capabilities[fullNode]) {
                                    events.emit('buddyCapabilities', id, capabilities[fullNode]);
                                } else {
                                    // Save this buddy so we can send the capability data when it arrives
                                    if (!capBuddies[fullNode]) {
                                        capBuddies[fullNode] = [];
                                    }
                                    capBuddies[fullNode].push(id);

                                    let getCaps = new Stanza('iq', {id: 'disco1', to: from, type: 'get'});
                                    getCaps.c('query', {
                                        xmlns: 'http://jabber.org/protocol/disco#info',
                                        node: fullNode
                                    });
                                    client.send(getCaps);
                                }
                            }
                        }

                    }
                }
            } else if (stanza.is('iq')) {
                if (stanza.getChild('ping', 'urn:xmpp:ping')) {
                    client.send(new Stanza('iq', {id: stanza.attrs.id, to: stanza.attrs.from, type: 'result'}));
                }
                // Response to capabilities request?
                else if (stanza.attrs.id === 'disco1') {
                    let query = stanza.getChild('query', 'http://jabber.org/protocol/disco#info');

                    // Ignore it if there's no <query> element - Not much we can do in this case!
                    if (!query) {
                        return;
                    }

                    let node = query.attrs.node,
                        identity = query.getChild('identity'),
                        features = query.getChildren('feature');

                    let result = {
                        clientName: identity && identity.attrs.name,
                        features: features.map(function (feature) {
                            return feature.attrs['let'];
                        })
                    };

                    capabilities[node] = result;

                    // Send it to all buddies that were waiting
                    if (capBuddies[node]) {
                        capBuddies[node].forEach(function (id) {
                            events.emit('buddyCapabilities', id, result);
                        });
                        delete capBuddies[node];
                    }
                }

                let cb = iqCallbacks[stanza.attrs.id];
                if (cb) {
                    cb(stanza);
                    delete iqCallbacks[stanza.attrs.id];
                }
            }
        });

        client.on('error', function (err) {
            events.emit('error', err);
        });

    };
}

module.exports = new Dxmpp();

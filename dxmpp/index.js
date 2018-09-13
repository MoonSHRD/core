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

const vcard = {
    FN:'full_name',
    TYPE:'avatar_type',
    BINVAL:'avatar',
    DESC:'bio',
    GIVEN:'firstname',
    FAMILY:'lastname',
    ADR:'address',
    DOM:'domain',
};

let NS_CHATSTATES = "http://jabber.org/protocol/chatstates";
let NS_ROOMSTATES = "http://jabber.org/protocol/muc";
let NS_DISCSTATES = "http://jabber.org/protocol/disco#items";
let NS_vCARDSTATES = "vcard-temp";

function parse_vcard(data,element) {
    element.children.forEach(function (element) {
        let el = vcard[element.name];
        if (el) {
            data[el]=element.text();
        }

        if (element.children){
            data=parse_vcard(data,element)
        }
        return data
    });
    return data;
}

String.prototype.hexEncode = function(){
    let hex, i;

    let result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
}

String.prototype.hexDecode = function(){
    let j;
    let hexes = this.match(/.{1,4}/g) || [];
    let back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

let Dxmpp = (function() {

    let self = this;
    let config;
    let client;
    let probeBuddies = {};
    let joinedRooms = {};
    let capabilities = {};
    let capBuddies = {};
    let iqCallbacks = {};
    let $ = qbox.create();


    this.take_time = function () {
        let now = new Date();
        return `${now.getHours()}:${now.getMinutes()}`
    };


    let events = new EventEmitter();
    this.on = function () {
        console.log(arguments);
        events.on.apply(events, Array.prototype.slice.call(arguments));
    };
    this.removeListener = function () {
        console.log(arguments);
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
            let stanza = new Stanza('presence', {from:client.options.jid,to: to, type: 'subscribed'});
            client.send(stanza);
        });
    };

    this.subscribe = function (to) {
        $.ready(function () {
            let stanza = new Stanza('presence', {from:client.options.jid,to: to, type: 'subscribe'});
            client.send(stanza);
        });
    };

    this.send = function (to, message, group) {
        $.ready(function () {
            let stanza = new Stanza('message', {from:client.options.jid,to: to, type: (group ? 'groupchat' : 'chat')});
            stanza.c('body').t(message);
            client.send(stanza);
        });
    };

    this.join = function (to, password) {

        $.ready(function () {
            let room = to.split('/')[0];
            // if (!joinedRooms[room]) {
            //     joinedRooms[room] = true;
            // }
            let stanza = new Stanza('presence', {from:client.options.jid,to: to}).c('x', {xmlns: NS_ROOMSTATES});
            // XEP-0045 7.2.6 Password-Protected Rooms
            if (password != null && password != "")
                stanza.c('password').t(password);
            client.send(stanza);
        });
    };

    this.register_room = function (name, password) {
        $.ready(function () {
            let stanza = new Stanza('presence', {from:client.options.jid,to: name, channel:'0'}).c('x', {xmlns: NS_ROOMSTATES});
            client.send(stanza);
        });
    };

    this.register_channel = function (name, domain, contractaddress, password) {
        $.ready(function () {
            let stanza = new Stanza('presence', {from:client.options.jid,to: name.hexEncode()+"@"+domain, contractaddress:contractaddress, channel:'1'}).
            c('x', {xmlns: NS_ROOMSTATES});
            client.send(stanza);
        });
    };

    this.find_group = function (part_of_name) {
        $.ready(function () {
            let stanza = new Stanza('iq', {from: client.options.jid,
                to: client.options.host, id: "123", type: "get",
                name: part_of_name.hexEncode()}).c('query', {xmlns: NS_DISCSTATES});
            client.send(stanza);
        });
    };

    this.set_vcard = function (firstname, lastname, bio, img) {
        $.ready(function () {
            let stanza = new Stanza('iq', {id:"v2", type:"set"})
                .c('vCard',{xmlns:NS_vCARDSTATES})
                .c('FN').t(firstname+" "+lastname).up()
                .c('ADR').t(client.options.username).up()
                .c('DOM').t(client.options.jidhost).up()
                .c('N')
                .c('FAMILY').t(lastname).up()
                .c('GIVEN').t(firstname).up()
                .c('MIDDLE').up().up();
            if (bio) {
                stanza.c('DESC').t(bio).up();
            }
            if (img) {
                stanza.c('PHOTO')
                    .c('TYPE').t(`image/jpeg`).up()
                    .c('BINVAL').t(img).up().up();
            }
            client.send(stanza);
        });
    };

    this.get_vcard = function (to) {
        $.ready(function () {
            let stanza = new Stanza('iq', {id:"v3", to:to, type:"get"})
                .c('vCard',{xmlns:NS_vCARDSTATES});
            client.send(stanza);
        });
    };

    this.invite = function (to, room, reason) {
        $.ready(function () {
            let stanza = new Stanza('message', {from:client.options.jid,to: room}).c('x', {xmlns: NS_ROOMSTATES + '#user'}).c('invite', {to: to});
            if (reason)
                stanza.c('reason').t(reason);
            client.send(stanza);
        });
    };

    this.send_suggesstion = function (to, text) {
        $.ready(function () {
            let stanza = new Stanza('iq', {id:'suggest', from:client.options.jid, to: to, type:'set'})
                .c('x', {xmlns: NS_ROOMSTATES + '#event'})
                .c('item', {type:'suggestion',group: to}).t(text);
            client.send(stanza);
        });
    };

    this.get_address = function () {
        if (client) {
            return client.options.username;
        } else {
            return undefined;
        }
    };

    this.disconnect = function () {
        $.ready(function () {
            let stanza = new Stanza('presence', {from:client.options.jid,type: 'unavailable'});
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
            let shit2 = stanza.attrs.from.split('@');
            id = shit2[0];
            host = shit2[1];
        }
        return {id, host, name}
    }

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
                        if (stanza.attrs.sender) {
                            sender = stanza.attrs.sender;
                            if (sender.split('/')) {
                                sender = sender.split('/')[0]
                            }
                            sender=sender.split('@');
                            sender={address:sender[0],domain:sender[1]}
                        }
                        events.emit('groupchat', get_room_data(stanza), message, sender, stamp);
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
                        if (stanza.getChild('x')){
                            let x_elem = stanza.getChild('x');
                            if (x_elem.attrs.xmlns === NS_ROOMSTATES + '#user') {
                                let room_data = get_room_data(stanza);
                                if (x_elem.getChild('item') && x_elem.getChild('item').attrs.role){
                                    let item_elem = x_elem.getChild('item');
                                    let role = item_elem.attrs.role;
                                    let avatar = stanza.attrs.avatar;
                                    let channel = stanza.attrs.channel;
                                    let contractaddress = stanza.attrs.contractaddress;
                                    room_data = {id:room_data.id, name: room_data.name.hexDecode(), domain: room_data.host, contractaddress:contractaddress, role: role, channel:channel, avatar:avatar};
                                    //joinedRooms[room_data.id] = room_data;
                                    events.emit('joined_room', room_data);
                                    return;
                                } else {
                                    let bla=stanza.attrs.user_joined.split("@");
                                    let user = {username:bla[0],domain:bla[1]};
                                    events.emit('user_joined_room', user, room_data);
                                    return;
                                }
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
                } else if (stanza.attrs.type === 'result') {
                    const card = stanza.getChild('vCard',NS_vCARDSTATES);
                    if (card) {
                        let data = {};
                        events.emit('received_vcard',parse_vcard(data,card));
                    }

                    const query = stanza.getChild('query', 'http://jabber.org/protocol/disco#items');
                    if (query) {
                        let resda = [];
                        query.getChildren("item").forEach(function (element) {
                            element.attrs.name=element.attrs.name.hexDecode();
                            resda.push(element.attrs);
                        });
                        // let result = query.getChildren("item").map(child => child.attrs);
                        // result.forEach(function (element) {
                        //     for (let attr in element){
                        //         if (attr==='name') {
                        //             re
                        //         }
                        //     }
                        // });
                        events.emit("find_groups", resda)
                    }
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
                } else {
                    if (stanza.getChild('x')) {
                        let id=stanza.attrs.from.split('/')[0];
                        // console.log(id);
                        let x_elem = stanza.getChild('x');
                        if (x_elem.attrs.xmlns === NS_ROOMSTATES + '#event') {
                            let item_elem = x_elem.getChild('item');
                            switch (item_elem.attrs.type) {
                                case "suggestion":
                                    const bla = id.split('@');
                                    const group_data = item_elem.attrs.group.split('@');
                                    let user = {id: bla[0], domain: bla[1]};
                                    events.emit('post_suggested', {
                                        user: user,
                                        group: {id:group_data[0],domain:group_data[1]},
                                        text: item_elem.getText()
                                    });
                                    break;
                            }
                            return
                        }
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

    return this;
});

module.exports = Dxmpp;

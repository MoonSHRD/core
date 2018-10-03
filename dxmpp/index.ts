let xmpp = require('./node-xmpp-client');
let Stanza = xmpp.Stanza;
let EventEmitter = require('events').EventEmitter;
//let util = require('util');
let qbox = require('qbox');
require('crypto');
let dif = require('js-x25519');
let helpers = require('../crypt/helpers.js');

let STATUS = {
    AWAY: "away",
    DND: "dnd",
    XA: "xa",
    ONLINE: "online",
    OFFLINE: "offline"
};

const vcard = {
    FN:'name',
    TYPE:'avatar_type',
    BINVAL:'avatar',
    DESC:'bio',
    GIVEN:'firstname',
    FAMILY:'lastname',
    ADR:'id',
    DOM:'domain',
};

let NS_CHATSTATES = "http://jabber.org/protocol/chatstates";
let NS_ROOMSTATES = "http://jabber.org/protocol/muc";
let NS_DISCSTATES = "http://jabber.org/protocol/disco#items";
let NS_vCARDSTATES = "vcard-temp";
let NS_CHATEVSTATES = "http://jabber.org/protocol/muc#event";

class Dxmpp {
    private static instance: Dxmpp;

    private config: object;
    private client;
    readonly events;
    private $;

    private constructor() {
        // this.config=config;
        this.events=new EventEmitter();
        this.$ = qbox.create();
    }

    static getInstance() {
        if (!Dxmpp.instance) {
            Dxmpp.instance = new Dxmpp();
        }
        return Dxmpp.instance;
    }

    // let self = this;
    // let config;
    // let client;
    // let probeBuddies = {};
    // let joinedRooms = {};
    // let capabilities = {};
    // let capBuddies = {};
    // let iqCallbacks = {};
    // let $ = qbox.create();


    take_time() {
        let now = new Date();
        return `${now.getHours()}:${now.getMinutes()>9?now.getMinutes():'0'+now.getMinutes()}`
    };

    private static parse_vcard(data,element) {
        element.children.forEach(function (element) {
            let el = vcard[element.name];
            if (el) {
                data[el]=element.text();
            }

            if (element.children){
                data=Dxmpp.parse_vcard(data,element)
            }
            return data
        });
        return data;
    }

    private static hexEncode(str){
        let hex, i;

        let result = "";
        for (i=0; i<str.length; i++) {
            hex = str.charCodeAt(i).toString(16);
            result += ("000"+hex).slice(-4);
        }

        return result
    }

    private static hexDecode(str){
        let j;
        let hexes = str.match(/.{1,4}/g) || [];
        let back = "";
        for(j = 0; j<hexes.length; j++) {
            back += String.fromCharCode(parseInt(hexes[j], 16));
        }

        return back;
    }

    private static generateSecret (mypriv, buddypub) {
        return helpers.toHexString(dif.getSharedKey(mypriv, buddypub));
    }

    private static encryptMsg(msg, secret) {
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

    }
    private static decryptMsg(msg, secret) {
        return helpers.decryptText(secret, msg);
    }

    // let events = new EventEmitter();
    on(event,callback) {
        this.events.on(event,callback);
    };
    removeListener(args) {
        this.events.removeListener.apply(this.events, Array.prototype.slice.call(args));
    };

    get_contacts() {
        this.$.ready(()=>{
            let roster = new Stanza('iq', {id: 'roster_0', type: 'get'});
            roster.c('query', {xmlns: 'jabber:iq:roster'});
            this.client.send(roster);
        });
    };

    acceptSubscription(user, pub_key) {
        this.$.ready(()=>{
            let stanza = new Stanza('presence', {from:this.client.options.jid,to: user.id+"@"+user.domain, type: 'subscribed'});
            stanza.c("pubKey").t(pub_key);
            this.client.send(stanza);
        });
    };

    subscribe(user, pub_key) {
        this.$.ready(()=>{
            let stanza = new Stanza('presence', {from:this.client.options.jid,to: user.id+"@"+user.domain, type: 'subscribe'});
            stanza.c("pubKey").t(pub_key);
            this.client.send(stanza);
        });
    };

    send(user, message, group, file) {
        this.$.ready(()=>{
            let stanza;
            if (file) {
                stanza = new Stanza('message', {from:this.client.options.jid,to: user.id+"@"+user.domain, type: (group ? 'groupchat' : 'chat'), subtype:'file', file_hash:file});
            } else {
                stanza = new Stanza('message', {from:this.client.options.jid,to: user.id+"@"+user.domain, type: (group ? 'groupchat' : 'chat')});
            }
            stanza.c('body').t(message);
            this.client.send(stanza);
        });
    };

    join(room, password) {
        this.$.ready(()=>{
            let stanza = new Stanza('presence', {from:this.client.options.jid,to: room.id+"@"+room.domain}).c('x', {xmlns: NS_ROOMSTATES});
            // XEP-0045 7.2.6 Password-Protected Rooms
            if (password != null && password != "")
                stanza.c('password').t(password);
            this.client.send(stanza);
        });
    };

    register_room(name, password) {
        this.$.ready(()=>{
            let stanza = new Stanza('presence', {from:this.client.options.jid,to: name, channel:'0'}).c('x', {xmlns: NS_ROOMSTATES});
            this.client.send(stanza);
        });
    };

    register_channel(channel, password) {
        this.$.ready(()=>{
            let stanza = new Stanza('presence', {from:this.client.options.jid,to: Dxmpp.hexEncode(channel.name)+"@"+channel.domain, channel:'1'}).
            c('x', {xmlns: NS_ROOMSTATES});
            this.client.send(stanza);
        });
    };

    find_group(part_of_name) {
        this.$.ready(()=>{
            let stanza = new Stanza('iq', {from: this.client.options.jid,
                to: this.client.options.host, id: "123", type: "get",
                name: Dxmpp.hexEncode(part_of_name)}).c('query', {xmlns: NS_DISCSTATES});
            this.client.send(stanza);
        });
    };

    set_vcard(firstname, lastname, bio, img) {
        this.$.ready(()=>{
            let stanza = new Stanza('iq', {id:"v2", type:"set"})
                .c('vCard',{xmlns:NS_vCARDSTATES})
                .c('FN').t(firstname+" "+lastname).up()
                .c('ADR').t(this.client.options.username).up()
                .c('DOM').t(this.client.options.jidhost).up()
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
            this.client.send(stanza);
        });
    };

    get_vcard(user) {
        this.$.ready(()=>{
            let stanza = new Stanza('iq', {id:"v3", to:user.id+"@"+user.domain, type:"get"})
                .c('vCard',{xmlns:NS_vCARDSTATES});
            this.client.send(stanza);
        });
    };

    invite(user, room, reason) {
        this.$.ready(()=>{
            let stanza = new Stanza('message', {from:this.client.options.jid,to: room}).c('x', {xmlns: NS_ROOMSTATES + '#user'}).c('invite', {to: user.id+"@"+user.domain});
            if (reason)
                stanza.c('reason').t(reason);
            this.client.send(stanza);
        });
    };

    send_suggesstion(user, text) {
        this.$.ready(()=>{
            let stanza = new Stanza('iq', {id:'suggest', from:this.client.options.jid, to: user.id+"@"+user.domain, type:'set'})
                .c('x', {xmlns: NS_ROOMSTATES + '#event'})
                .c('item', {type:'suggestion',group: user.id+"@"+user.domain}).t(text);
            this.client.send(stanza);
        });
    };

    get_address() {
        if (this.client) {
            return this.client.options.username;
        } else {
            return undefined;
        }
    };

    disconnect() {
        this.$.ready(()=>{
            let stanza = new Stanza('presence', {from:this.client.options.jid,type: 'unavailable'});
            stanza.c('status').t('Logged out');
            this.client.send(stanza);

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

    private static get_room_data(stanza) {
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

    connect(config) {
        this.config=config;
        this.client = new xmpp.Client(this.config);

        this.client.on('close', ()=>{
            this.$.stop();
            this.events.emit('close');
        });

        this.client.on('online', (data)=>{
            this.client.send(new Stanza('presence'));
            this.events.emit('online', data);
            this.$.reset();
            this.$.start();

            // keepalive
            if (this.client.connection.socket) {
                this.client.connection.socket.setTimeout(0);
                this.client.connection.socket.setKeepAlive(true, 10000);
            }
        });

        this.client.on('stanza', (stanza)=>{
            this.events.emit('stanza', stanza);
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
                        let bla=id.split("@");
                        let user = {id:bla[0],domain:bla[1]};
                        let file = null;
                        if (stanza.attrs.subtype==='file'){
                            file=stanza.attrs.file_hash;
                        }
                        this.events.emit('chat', user, message,file);
                    }

                    let chatstate = stanza.getChildByAttr('xmlns', NS_CHATSTATES);
                    if (chatstate) {
                        this.events.emit('chatstate', stanza.attrs.from, chatstate.name);
                    }

                } else if (stanza.attrs.type == 'groupchat') {

                    let body = stanza.getChild('body');
                    if (body) {
                        let message = body.getText();
                        let sender = null;
                        let stamp = null;
                        let file = null;
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
                        if (stanza.attrs.subtype==='file'){
                            file=stanza.attrs.file_hash;
                        }
                        this.events.emit('groupchat', Dxmpp.get_room_data(stanza), message, sender, stamp,file);
                    }
                }
            } else if (stanza.is('presence')) {

                let from = stanza.attrs.from;
                if (from) {
                    let id = from.split('/')[0];
                    let resource = from.split('/')[1];
                    let bla=id.split("@");
                    let user = {id:bla[0],domain:bla[1]};
                    if (stanza.attrs.type == 'subscribe') {
                        let key = stanza.getChildText("pubKey");
                        //handling incoming subscription requests
                        this.events.emit('subscribe', user, key);
                    } else if (stanza.attrs.type == 'unsubscribe') {
                        //handling incoming unsubscription requests
                        this.events.emit('unsubscribe', user);
                    } else if (stanza.attrs.type == 'subscribed') {
                        //handling incoming unsubscription requests
                        let key = stanza.getChildText("pubKey");
                        this.events.emit('subscribed', user, key);
                    } else {
                        //looking for presence stenza for availability changes
                        let statusText = stanza.getChildText('status');
                        if (stanza.getChild('x')){
                            let x_elem = stanza.getChild('x');
                            if (x_elem.attrs.xmlns === NS_ROOMSTATES + '#user') {
                                let room_data = Dxmpp.get_room_data(stanza);
                                if (x_elem.getChild('item') && x_elem.getChild('item').attrs.role){
                                    let item_elem = x_elem.getChild('item');
                                    let role = item_elem.attrs.role;
                                    let avatar = stanza.attrs.avatar;
                                    let channel = stanza.attrs.channel;
                                    let room_data_full = {id:room_data.id, name: Dxmpp.hexDecode(room_data.name), domain: room_data.host, role: role, channel:channel, avatar:avatar};
                                    //joinedRooms[room_data.id] = room_data;
                                    let messages = stanza.getChild("set");
                                    let list_messages = [];
                                    messages.getChildren("item").forEach(function (element) {
                                        list_messages.push(element.attrs);
                                    });
                                    this.events.emit('joined_room', room_data_full, list_messages);
                                    return;
                                } else {
                                    bla=stanza.attrs.user_joined.split("@");
                                    let date = stanza.attrs.date;
                                    user = {id:bla[0],domain:bla[1]};
                                    this.events.emit('user_joined_room', user, room_data, date);
                                    return;
                                }
                            }
                        }
                        let state = (stanza.getChild('show')) ? stanza.getChild('show').getText() : STATUS.ONLINE;
                        state = (state == 'chat') ? STATUS.ONLINE : state;
                        state = (stanza.attrs.type == 'unavailable') ? STATUS.OFFLINE : state;
                        this.events.emit('buddy', user, state, statusText, resource);
                    }
                }
            } else if (stanza.is('iq')) {
                if (stanza.getChild('ping', 'urn:xmpp:ping')) {
                    this.client.send(new Stanza('iq', {id: stanza.attrs.id, to: stanza.attrs.from, type: 'result'}));
                } else if (stanza.attrs.type === 'result') {
                    const card = stanza.getChild('vCard',NS_vCARDSTATES);
                    if (card) {
                        let data = {};
                        this.events.emit('received_vcard',Dxmpp.parse_vcard(data,card));
                        return;
                    }

                    let query = stanza.getChild('query', NS_DISCSTATES);
                    if (query) {
                        let resda = [];
                        query.getChildren("item").forEach(function (element) {
                            element.attrs.name=Dxmpp.hexDecode(element.attrs.name);
                            resda.push(element.attrs);
                        });
                        this.events.emit("find_groups", resda)
                    }
                    query = stanza.getChild('confirmation', NS_DISCSTATES);
                    if (query) {
                        let resda = query.getChild("item");
                        this.events.emit("confirmation", resda.attrs)
                    }
                }
                else {
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
                                    this.events.emit('post_suggested', {
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
            }
        });

        this.client.on('error', (err)=>{
            this.events.emit('error', err);
        });

    };

    // return this;
}

module.exports = Dxmpp;

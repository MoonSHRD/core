'use strict';
/* eslint-disable no-console */

const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const Node = require('./libp2p-bundle.js');
const pull = require('pull-stream');
const Pushable = require('pull-pushable');
const EventEmitter = require('events').EventEmitter;
const qbox = require('qbox');

function get_push () {
    let p = Pushable((err) => {
        console.log('push stream closed!',err);
    });

    return p;
}

class Messenger {
constructor() {
    let events = new EventEmitter();
    this.on = function() {
        events.on.apply(events, Array.prototype.slice.call(arguments));
    };
    this.removeListener = function() {
        events.removeListener.apply(events, Array.prototype.slice.call(arguments));
    };
    this.$ = qbox.create();
}

    node_start(config) {
        this.config=config;



        if (config.privKey.key) {
            try {
                PeerId.createFromPrivKey(config.privKey.key,(err, id) => {
                    if (err) { throw err }
                    this.pre_start_node(id)
                })
            } catch (e) {
                throw e;
            }
        } else {
            PeerId.create({ bits: 1024 }, (err, id) => {
                if (err) { throw err }
                config.privKey.func(id.privKey);
                this.pre_start_node(id)
            });
        }
    }

    pre_start_node(id){
        this.peerInfo = new PeerInfo(id);
        this.peer_id = this.peerInfo.id.toB58String();
        this.peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/10330');
        this.node = new Node({
            peerInfo: this.peerInfo
        });

        this.start();
    }

    dial(addr,func) {
        this.node.dial(addr, (err, conn) => {
            if (err) {
                throw err
            }
            func(conn);
        });
        console.log("dialed");
    }

    dial_protocol(addr,protocol,func){
        this.node.dialProtocol(addr, protocol, (err, conn) => {
            if (err) {
                throw err
            }

            let p=get_push();

            pull(
                p,
                conn
            );
            func(conn,p);
        });
    }


    pubsub(channel,func) {
        this.$.ready(function() {
            this.node.pubsub.subscribe(channel, (msg) => {
                try {
                    let data = JSON.parse(msg.data.toString());
                    delete data["data"][this.peer_id];
                    func(data);
                } catch (e) {
                    console.log(e);
                }
            }, () => {});
            console.log("subscribed");
        })
    };


    read_msg(func, conn, p) {
        this.$.ready(function() {
            let data_drainer = pull.drain(drain_data,drain_err);

            console.log("now listening for messages");

            pull(
                conn,
                pull.map((data) => {
                    data=data.toString('utf8');
                    console.log("received message on chat: "+data);
                    func(data);
                    return data
                }),
                data_drainer
            );
            function drain_data(data) {
                if (!data){
                    console.log("sth wrong");
                }
                //console.log(data);
            }

            function drain_err(err){
                if (err) {
                    console.log(err);
                    p.end();
                    data_drainer.abort(new Error('stop!'));
                }
            }
        })
    };


    handle(handle_protocol, func) {
        this.$.ready(function () {
            this.node.handle(handle_protocol, (protocol, conn) => {

                let p=get_push();

                pull(
                    p,
                    conn
                );
                func(protocol, conn, p)
            });
        })
    };


    send_msg(msg, p) {
        this.$.ready(function() {
            p.push(msg);
            console.log("send msg: "+msg);
        })
    };


    peer_disconnect(func) {
        this.$.ready(function () {
            this.node.on('peer:disconnect', (peer) => {
                this.node.hangUp(peer, ()=>{});
                func(peer);
            });
        })
    };


    start() {
        this.node.start((err) => {
            if (err) {throw err}
            this.$.start();
            // this.config.main_func(this);
        this.on('start handling', function() {

        });
        this.on('close', function() {
            $.stop();
            events.emit('close');
            });
        });
    }
}

module.exports = new Messenger;
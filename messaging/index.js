'use strict';
/* eslint-disable no-console */

const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const Node = require('./libp2p-bundle.js');
const pull = require('pull-stream');
const Pushable = require('pull-pushable');
const p = Pushable();
const fs = require("fs");

const path_to_peer = "./id";


class Messenger {

    node_start(config) {
        this.config=config;

        const path_to_peer_json = path_to_peer+'.json';

        if (!fs.existsSync(path_to_peer_json)) {
            PeerId.create({ bits: 1024 }, (err, id) => {
                if (err) { throw err }
                let id_file = fs.writeFileSync(path_to_peer_json, JSON.stringify(id.toJSON(), null, 2));
                this.pre_start_node(id)
            });
        } else {
            PeerId.createFromJSON(require(path_to_peer), (err, id) => {
                if (err) { throw err }
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
        //console.log("created");

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
            func(conn);
        });
    }

    pubsub(channel,func) {
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
    }

    read_msg(func,conn) {

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
            console.log(data);
        }

        function drain_err(err){
            if (err) {
                //console.log("error");
                console.log(err);
                //throw err;
                //data_drainer.abort(new Error('stop!'));
            }
        }
    }

    handle(handle_protocol,func) {
        this.node.handle(handle_protocol, (protocol, conn) => {
            pull(
                p,
                conn
            );
            func(protocol,conn,p)
        });
    }

    send_msg(msg,p) {
        p.push(msg);
    }

    start() {
        this.node.start((err) => {

            this.node.on('peer:disconnect', (peer) => {
                this.node.hangUp(peer, ()=>{})
            });

            if (err) { throw err }
            this.config.main_func(this);
        });
    }
}

module.exports = Messenger;
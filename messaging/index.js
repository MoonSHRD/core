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
        pull(
            conn,
            pull.map((data) => {
                let ddtt=data.toString('utf8');
                console.log("received message on chat: "+ddtt);
                func(ddtt);
                return ddtt
            }),
            pull.drain(console.log)
        );
    }

    handle(handle_protocol,func) {
        this.node.handle(handle_protocol, func);
    }

    static send_msg(msg,conn) {
        pull(
            p,
            conn
        );
        p.push(msg);
    }



    start() {
        this.node.start((err) => {
            if (err) { throw err }
            this.config.main_func(this);
        });
    }
}

module.exports = Messenger;
function D_xmpp() {

    let xmpp = require('simple-xmpp');

    this.receive_msg=function(func){
        xmpp.on('chat', function(from, message) {
            console.log(`received msg: "${message}", from: "${from}"`);
            func(from,message);
        });
    };

    this.online=function(func){
        xmpp.on('online', function(data) {
            console.log('Online with JID: ' + data.jid.user);
            func(data);
        });
    };

    this.error=function(func){
        xmpp.on('error', function(err) {
            console.log(err);
            func(err);
        });
    };

    this.subscribe=function (dude) {
        xmpp.subscribe(dude);
    };

    this.user_subscribed=function(func){
        xmpp.on('subscribe', function(from) {
            console.log(from);
            func(from);
        });
    };

    this.accept_sub=function(from){
        xmpp.acceptSubscription(from);
    };

    this.send_msg=function(to,msg){
        xmpp.send(to, msg);
    };

    this.friends_online=function(func){
        xmpp.on('buddy', function(jid, state, statusText) {
            console.log(`${jid} is ${state}` + ( statusText ? state : "" ));
            func(jid, state, statusText);
        });
    };

    this.start=function(config){
        xmpp.connect(config);

        xmpp.getRoster();
    }
}

module.exports = new D_xmpp();
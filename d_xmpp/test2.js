const d_xmpp = require('./index.js');

d_xmpp.online((data)=>{

});

d_xmpp.friends_online((jid, state, statusText)=>{
    d_xmpp.send_msg(jid,"Hello, cocky!")
});

d_xmpp.receive_msg((from,message)=>{
    console.log(`from: ${from} msg: ${message}`);
});

d_xmpp.user_subscribed((who)=>{
    d_xmpp.accept_sub(who);
});

let config={
    jid					: 'penis@localhost',
    password		    : 'big',
    host				: 'localhost',
    port				: 5222
};

d_xmpp.start(config);
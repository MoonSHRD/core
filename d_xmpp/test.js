const d_xmpp = require('./index.js');

d_xmpp.online((data)=>{

});

d_xmpp.friends_online((jid, state, statusText)=>{
    d_xmpp.send_msg(jid,"Hello, cocky!");
});

d_xmpp.receive_msg((from,message)=>{
    console.log(`from: ${from} msg: ${message}`);
});

let config={
    jid					: 'userer@localhost',
    password		    : 'penciler',
    host				: 'localhost',
    port				: 5222
};

d_xmpp.subscribe("penis@localhost");

d_xmpp.start(config);

//d_xmpp.send_msg("penis@localhost","sosi");

//
// xmpp.on('online', function(data) {
//     console.log('Connected with JID: ' + data.jid.user);
//     console.log(data);
//     console.log('Yes, I\'m connected!');
// });
//
// xmpp.on('chat', function(from, message) {
//     console.log(from);
//     console.log(message);
//     xmpp.send(from, 'echo: ' + message);
// });
//
// xmpp.on('error', function(err) {
//     console.error(err);
// });
//
// xmpp.on('subscribe', function(from) {
//     // if (from === 'a.friend@gmail.com') {
//     //     xmpp.acceptSubscription(from);
//     // }
//     xmpp.acceptSubscription(from);
//     console.log(from);
// });
//
// xmpp.on('buddy', function(jid, state, statusText) {
//     console.log("---------------%s is now '%s' (%s)", jid, state, statusText);
//     xmpp.send(jid, "chlen");
//
//
//     process.stdin.setEncoding('utf8');
//     process.openStdin().on('data', (chunk) => {
//         let data = chunk.toString();
//         console.log(data);
//         if (data.search(/send [^ ]* ".*"/i) !== -1) {
//             data = data.match( /send ([^ ]*) "(.*)"/i );
//             let addr = data[1];
//             let msg = data[2];
//             console.log(addr);
//             console.log(msg);
//             xmpp.send(addr, msg);
//         }
//     })
//     // xmpp.getVCard(argv[2], function(vcard) {
//     //     console.log(vcard);
//     //     process.exit(0);
//     // });
// });
//
// xmpp.connect({
//     jid					: 'kkk@localhost',
//     password		    : '123',
//     host				: '192.168.1.2',
//     port				: 5222
// });
//
// //xmpp.subscribe('your.friend@gmail.com');
// // check for incoming subscription requests
// xmpp.getRoster();
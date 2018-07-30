const dxmpp = require('./index2.js');

dxmpp.on('online',function (data) {
    console.log(data);
    console.log("mazafaka");
});

dxmpp.on('buddy', function(jid, state, statusText) {
    console.log(`${jid} is ${state}` + ( statusText ? state : "" ));
});

dxmpp.on('subscribe', function(from) {
    console.log(from);
    dxmpp.acceptSubscription(from);
    dxmpp.send(from,"fuck you");
});

dxmpp.on('chat', function(from, message) {
    console.log(`received msg: "${message}", from: "${from}"`);
});

dxmpp.subscribe("0x6c1567aee7f9d239bf1f7988bc009c00891c1571@localhost");

// dxmpp.acceptSubscription("0x6c1567aee7f9d239bf1f7988bc009c00891c1571@localhost");
// dxmpp.subscribe("0x6c1567aee7f9d239bf1f7988bc009c00891c1571@localhost");

// dxmpp.subscribe()

// let addr="0x0fEaB3B11b087c9e6f1B861e265b78C693aA100b";
let addr="0x0feab3b11b087c9e6f1b861e265b78c693aa100b";
let priv="0xe8662f419b434b3e17854f26eb37878fdcfd34adfa0c6c7990fa8e546efd1951";

let config={
    jidhost				: 'localhost',
    privKey				: priv,
    host				: 'localhost',
    port				: 5222,
    firstname		    : "Nikita",
    lastname		    : "Metelkin"
};

dxmpp.connect(config);
dxmpp.get_contacts();
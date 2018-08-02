const dxmpp = require('./index2.js');

dxmpp.on('online',function () {
    console.log("mazafaka")
});

dxmpp.on('buddy', function(jid, state, statusText) {
    console.log(`${jid} is ${state}` + ( statusText ? state : "" ));
});

dxmpp.on('subscribe', function(from) {
    console.log(from);
    dxmpp.acceptSubscription(from);
});

dxmpp.on('chat', function(from, message) {
    console.log(`received msg: "${message}", from: "${from}"`);
});

// let addr="0x6C1567aeE7f9D239Bf1f7988Bc009C00891C1571";
let addr="0x6c1567aee7f9d239bf1f7988bc009c00891c1571";
let priv="0x8a9f20e0fce80f895c236a3d987880fc51a5f7870f68ed20c823276faa45c167";


dxmpp.subscribe("0x0feab3b11b087c9e6f1b861e265b78c693aa100b@localhost");
dxmpp.send("0x0feab3b11b087c9e6f1b861e265b78c693aa100b@localhost","fuck you");
// dxmpp.acceptSubscription("0x0feab3b11b087c9e6f1b861e265b78c693aa100b@localhost");

let config={
    jidhost				: 'localhost',
    privKey				: priv,
    host				: 'localhost',
    port				: 5222
};

dxmpp.connect(config);
dxmpp.get_contacts();

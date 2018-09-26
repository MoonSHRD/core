let Dxmpp = require("./index");

let dxmpp = Dxmpp.getInstance();

dxmpp.on('online',function () {
    console.log("mazafaka")
});

dxmpp.on('buddy', function(user, state, statusText) {
    console.log(`${user.id}@${user.domain} is ${state}` + ( statusText ? state : "" ));
});

dxmpp.on('joined_room', function(room_data) {
    console.log(`joined ${room_data.name} as ${room_data.role}`);
    // dxmpp.send(room_data.id+"@localhost", "fucka", true);
});

dxmpp.on('user_joined_room', function(user, room_data) {
    console.log(`user ${user.username} joined ${room_data.name}`);
    // dxmpp.send(room_data.id+"@localhost", "fucka", true);
});

dxmpp.on('groupchat', function(room_data, message, sender, stamp) {
    console.log(`${sender} says ${message} in ${room_data.name} chat on ${stamp}`);
    // if(from !== options.nick)
    // dxmpp.send(conference, from +': echo: ' + message, true);
});

dxmpp.on('chat', function(from, message) {
    console.log(`received msg: "${message}", from: "${from}"`);
});

dxmpp.on("confirmation", function(result) {
    console.log(`Successfully send message: id:${result.userid}, server id: ${result.DBid}`);
 });

dxmpp.on("find_groups", function(result) {
    console.log('Found group(s):');
    result.forEach(function (group) {
        console.log(group);
    });
});

dxmpp.on('subscribe', function(from, key) {
    console.log(`User ${from.id}@${from.domain} wants to subscribe to you. His pubkey: ${key}`);
    dxmpp.acceptSubscription(from, "key2");
});
dxmpp.on('subscribed', function(from, key) {
    console.log(`Successfully subscribe to user ${from.id}@${from.domain}`);
});

// let addr="0x6C1567aeE7f9D239Bf1f7988Bc009C00891C1571";
// let addr="0x6c1567aee7f9d239bf1f7988bc009c00891c1571";
let priv="0x8a9f20e0fce80f895c236a3d987880fc51a5f7870f68ed20c823276faa45c167";




let config={
    jidhost				: 'localhost',
    privKey				: priv,
    host				: 'localhost',
    port				: 5222
};

dxmpp.connect(config);
dxmpp.set_vcard('Nikita','Metelkin','Chel1');
// dxmpp.get_vcard({id:"0x6c1567aee7f9d239bf1f7988bc009c00891c1571", domain: "localhost"});
dxmpp.get_contacts();
// dxmpp.register_channel({name: "testgroup3", domain:"localhost"});
// dxmpp.find_group("testgroup");
// dxmpp.join({id: "testgroup3", domain: "localhost"});
dxmpp.subscribe({id: "0x0feab3b11b087c9e6f1b861e265b78c693aa100b", domain:"localhost"});
// dxmpp.acceptSubscription({id: "0x0feab3b11b087c9e6f1b861e265b78c693aa100b", domain:"localhost"});
// dxmpp.send({id: "0x0feab3b11b087c9e6f1b861e265b78c693aa100b", domain: "localhost"}, "Hello!", 1);

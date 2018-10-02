let Dxmpp = require("./index");

let dxmpp = Dxmpp.getInstance();

dxmpp.on('online',function () {
    console.log("Ready for some shit")
});

dxmpp.on('buddy', function(user, state, statusText) {
    console.log(`${user.id}@${user.domain} is ${state}` + ( statusText ? state : "" ));
});

dxmpp.on('joined_room', function(room_data, messages) {
    console.log(`joined ${room_data.name} as ${room_data.role}`);
    console.log(`old messages:`);
    messages.forEach(function (message) {
        console.log(`${message.time}:${message.message}`)
    });
    // dxmpp.send(room_data.id+"@localhost", "fucka", true);
});

dxmpp.on('user_joined_room', function(user, room_data, date) {
    console.log(`user ${user.id}@${user.domain} joined ${room_data.id}@${room_data.host} at ${date}`);
    // dxmpp.send(room_data.id+"@localhost", "fucka", true);
});

dxmpp.on('groupchat', function(room_data, message, sender, date) {
    // console.log(`${sender} says ${message} in ${room_data.name} chat on ${stamp}`);
    console.log(`New message from group: ${room_data.id}@${room_data.host} - ${message}, date: ${date}`);
    // if(from !== options.nick)
    // dxmpp.send(conference, from +': echo: ' + message, true);
});

dxmpp.on('chat', function(from, message, date) {
    console.log(`received msg: "${message}", from: "${from.id}@${from.domain}" at ${date}`);
});

dxmpp.on("confirmation", function(result) {
    console.log(`Successfully send message: id:${result.userid}, server id: ${result.DBid}, time: ${result.date}`);
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
// dxmpp.set_vcard('Nikita','Metelkin','Chel1');
// dxmpp.get_vcard({id:"0x6c1567aee7f9d239bf1f7988bc009c00891c1571", domain: "localhost"});
dxmpp.get_contacts();
// dxmpp.register_channel({name: "Test", domain:"localhost"});
// dxmpp.find_group("Test");
dxmpp.join({id: "0x39ba55cb80a4c7c1daf385650be389d1d9c9d6c8", domain: "localhost"});
// dxmpp.subscribe({id: "0x0feab3b11b087c9e6f1b861e265b78c693aa100b", domain:"localhost"});
// dxmpp.send({id:"0x47a042e8e3c2bc8483d1f032c957c8ee1e784cb1", domain: "localhost"} , "Test2", 1, true); //channel
// dxmpp.send({id:"0x6c1567aee7f9d239bf1f7988bc009c00891c1571", domain: "localhost"}, "Hello ", 1, false); //user_chat


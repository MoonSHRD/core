const dxmpp = require('./index');
let addr="0x0feab3b11b087c9e6f1b861e265b78c693aa100b";
let priv="0xe8662f419b434b3e17854f26eb37878fdcfd34adfa0c6c7990fa8e546efd1951";

dxmpp.on('online',function (data) {
    console.log(data);
    console.log("mazafaka");
    // dxmpp.join('conference@localhost/hello_world',123);
});

dxmpp.on('buddy', function(jid, state, statusText) {
    console.log(`${jid} is ${state}` + ( statusText ? state : "" ));
});

dxmpp.on('joined_room', function(room_data) {
    console.log(`joined ${room_data.name} as ${room_data.role}`+ room_data.channel==='1'?' room is a channel':'');
    // dxmpp.send(room_data.id+"@localhost", "fucka", true);
});

dxmpp.on('subscribe', function(from) {
    console.log(from);
    dxmpp.acceptSubscription(from);
    dxmpp.send(from,"fuck you");
});

dxmpp.on('chat', function(from, message) {
    console.log(`received msg: "${message}", from: "${from}"`);
});

dxmpp.on('groupchat', function(room_data, message, sender, stamp) {
    console.log(`${sender} says ${message} in ${room_data.name} chat on ${stamp}`);
    // if(from !== options.nick)
    // dxmpp.send(conference, from +': echo: ' + message, true);
});

dxmpp.on('error', function (err) {
    console.log(err);
});

dxmpp.on("find_groups", function(result) {
    console.log('Here it is your damn groups!');
    result.forEach(function (group) {
        console.log(group);
    });
});

// dxmpp.register_room("hello_world@localhost");
// dxmpp.register_channel("hello_world@localhost");

let config={
    jidhost				: 'localhost',
    privKey				: priv,
    host				: 'localhost',
    port				: 5222,
    firstname		    : "Nikita",
    lastname		    : "Metelkin"
};

dxmpp.connect(config);
// dxmpp.get_contacts();
dxmpp.find_group('hello_v_rot');
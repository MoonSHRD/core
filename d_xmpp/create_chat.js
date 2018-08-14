const dxmpp = require('./index');
let addr = "0x0feab3b11b087c9e6f1b861e265b78c693aa100b";
let priv = "0xe8662f419b434b3e17854f26eb37878fdcfd34adfa0c6c7990fa8e546efd1951";

dxmpp.on('online', function (data) {
    console.log(data);
});

let config = {
    jidhost: 'localhost',
    privKey: priv,
    host: 'localhost',
    port: 5222,
    firstname: "Nikita",
    lastname: "Metelkin"
};

dxmpp.connect(config);

dxmpp.register_channel("hello_world@localhost");

dxmpp.on('joined_room', function (room_data) {
    console.log(`joined ${room_data.name} as ${room_data.role}` + (room_data.channel === '1' ? ', room is a channel' : ''));
    console.log(room_data);
});

dxmpp.on('user_joined_room', function (user, room_data) {
    console.log(`user joined`);
    console.log(`user ${user.username} joined ${room_data.name}`);

    dxmpp.send(room_data.name+"@"+room_data.host, "sobaky", true);
});

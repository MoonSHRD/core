const dxmpp = require('./index');
let priv1 = "0x8a9f20e0fce80f895c236a3d987880fc51a5f7870f68ed20c823276faa45c167";

dxmpp.on('online', function (data) {
    console.log(data);
});
let room = '60@localhost';

let config = {
    jidhost: 'localhost',
    privKey: priv1,
    host: 'localhost',
    port: 5222,
    firstname: "Nikita",
    lastname: "Metelkin"
};

dxmpp.connect(config);

dxmpp.on('joined_room', function (room_data) {
    console.log(`joined ${room_data.name} as ${room_data.role}` + (room_data.channel === '1' ? ', room is a channel' : ''));
    console.log(room_data);
    // console.log('joined');

    dxmpp.send(room, "sobaky", true);
});

dxmpp.on('groupchat', function (room_data, message, sender, stamp) {
    console.log(`${sender} says ${message} on ${room_data.name}`);
    // console.log(room_data);
});

dxmpp.on('user_joined_room', function (user, room_data) {
    console.log(`user joined`);
    console.log(`user ${user.username} joined ${room_data.name}`);

    dxmpp.send(room_data.name+"@"+room_data.host, "sobaky", true);
});

dxmpp.join(room);

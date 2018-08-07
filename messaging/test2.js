const Messenger = require('./index.js');

const chat_protocol = '/chat/1.0.0';
const main_node_channel = 'news';
const mainNodeId = 'QmYcuVrDn76jLz62zAQDmfttX9oSFH1cGXSH9rdisbHoGP';
const mainNodeIp = '192.168.1.9';
const mainNodeAddr = '/ip4/' + mainNodeIp + '/tcp/10333/ipfs/' + mainNodeId;


Messenger.on('read_msg', function() {
    Messenger.read_msg((msg) => {
        console.log(msg);
    }, conn, push);
});

const config = {
    privKey: {
        key: false,
        func(key) {
            //save key somewhere
        }
    }
};

Messenger.node_start(config);

Messenger.handle(chat_protocol, (protocol, conn, push) => {
    console.log("start handling");
    // Messenger.read_msg((msg) => {
    //     console.log("msg: " + msg);
    //     Messenger.send_msg("received msg: " + msg, push);
    // }, conn, push);
    Messenger.read_msg((msg) => {
        console.log("msg: " + msg);
        // Messenger.send_msg("received msg: " + msg, push);
    }, conn, push);
});
Messenger.pubsub(main_node_channel, (data) => {
    console.log(data);
});



Messenger.dial(mainNodeAddr, (conn) =>
{

});

//send message
process.stdin.setEncoding('utf8');
process.openStdin().on('data', (chunk) => {
    let data = chunk.toString();
    console.log(data);
    if (data.search(/connect \/.*/i) !== -1) {
        let addr = data.match(/connect (\/.*)/i)[1];
        console.log(addr);
        Messenger.dial_protocol(addr, chat_protocol, (conn, push) => {
            // Messenger.read_msg((msg) => {
            //     console.log(msg);
            // }, conn, push);
            Messenger.send_msg("I've been connected to you", push);
        });
    }
});

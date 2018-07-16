const Messenger = require ('./index.js');

const chat_protocol = '/chat/1.0.0';
const main_node_channel = 'news';
const mainNodeId = 'QmYcuVrDn76jLz62zAQDmfttX9oSFH1cGXSH9rdisbHoGP';
const mainNodeIp = '192.168.1.12';
const mainNodeAddr = '/ip4/'+mainNodeIp+'/tcp/10333/ipfs/'+mainNodeId;



const config = {
    main_func: function (messenger) {
        messenger.handle(chat_protocol,(protocol, conn, push) => {
            console.log("start handling");
            messenger.read_msg((msg)=>{
                console.log("msg: " + msg);
                messenger.send_msg("received msg: " + msg,push);
            },conn,push);
        });

        messenger.pubsub(main_node_channel,(data) => {
            console.log(data);
        });

        messenger.dial(mainNodeAddr,(conn)=>{});


        // messenger.dial_protocol(addr,protocol,(conn)=>{
        //     messenger.read_msg((msg)=>{
        //         console.log(msg);
        //     },conn);
        //     messenger.send_msg("I've been connected to you",conn);
        // });
    },
    privKey: {
        key: false,
        func (key) {
            //save key somewhere
        }
    }
};

let messenger = new Messenger('./id');
messenger.node_start(config);
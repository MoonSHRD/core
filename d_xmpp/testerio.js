'use strict'

/**
 * Echo Bot - the XMPP Hello World
 **/

var ethers = require('ethers');
var SigningKey = ethers.SigningKey;

var Client = require('./node-xmpp-client');
var bip39 = require('bip39');


let generationMnemonic = bip39.generateMnemonic();
// let privKey=bip39.mnemonicToSeedHex(generationMnemonic);
let wallet=ethers.Wallet.fromMnemonic(generationMnemonic);

var config={
    jidhost				: 'localhost',
    privKey				: wallet.privateKey,
    host				: 'localhost',
    port				: 5222
};

// if (argv.length !== 4) {
//     console.error(
//         'Usage: node echo_bot.js <my-jid> <my-password>'
//     )
//     process.exit(1)
// }

var client = new Client(config)

client.on('online', function () {
    console.log('online')
    client.send(new Client.Stanza('presence', { })
        .c('show').t('chat').up()
        .c('status').t('Happily echoing your <message/> stanzas')
    )
})

client.on('stanza', function (stanza) {
    if (stanza.is('message') &&
        // Important: never reply to errors!
        (stanza.attrs.type !== 'error')) {
        // Swap addresses...
        stanza.attrs.to = stanza.attrs.from
        delete stanza.attrs.from
        // and send back
        console.log('Sending response: ' + stanza.root().toString())
        client.send(stanza)
    }
})

client.on('error', function (e) {
    console.error(e)
})

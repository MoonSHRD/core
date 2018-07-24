'use strict'

/**
 * Echo Bot - the XMPP Hello World
 **/
var Client = require('./node-xmpp-client')
var argv = process.argv

var config={
    jidhost				: 'localhost',
    privKey				: '0xbbfe1c82264e0c805d8d5cc8005384b0cdb0170b98857f2e92e6a078e7a36354',
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

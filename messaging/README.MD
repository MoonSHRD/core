# Core - Messenger
Core is a wrapper for libp2p, created specifically for the messenger functionality.

## Requirements
In order to run and test Messenger you need a running instance of the **Main Node**, that will provide you with available peers.

## Running

```
const Messenger = require('/path/to/core/messaging');
let messenger = new Messenger();
messenger.node_start(config);
```

#### Config:

Config must be defined and passed to node_start method.
It must contain privKey object and main_func.

#### privKey:

object that contains key and func.
key - private key string or false.
func - functions that defines behavior after key is created (only if key is false) takes key as an argument.

#### main_func:

function that takes messenger class as an argument and defines messenger behaviour after node is started.

## Методы:

#### `messenger.handle(handle_protocol,func)`
- `handle_protocol` - which protocol to handle (string)
- `func(protocol,conn,p)`
    - `protocol` - String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
    - `conn` - is a [Connection](https://github.com/libp2p/interface-connection) object
    - `p` - instance of [pull-pushable](https://github.com/pull-stream/pull-pushable)
    
#### `messenger.dial(addr,func)`
- `addr` - which address to dial (string)
- `func(conn)`
    - `conn` - is a [Connection](https://github.com/libp2p/interface-connection) object

#### `messenger.dial_protocol(addr,protocol,func)`
- `addr` - which address to dial (string)
- `protocol` -String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
- `func(conn,p)`
    - `conn` is a [Connection](https://github.com/libp2p/interface-connection) object
    - `p` - instance of [pull-pushable](https://github.com/pull-stream/pull-pushable)

#### `messenger.pubsub(channel,func)`
- `channel` - which channel to subscribe
- `func(data)`
    - `data` - data received from channel

#### `messenger.peer_disconnect(func)`
- `func(peer)`
    - `peer` - instance of [PeerInfo](https://github.com/libp2p/js-peer-info)

#### `messenger.node_start(config)`
- `config` - instance of config from above

#### `messenger.read_msg(func,conn,p)`
- `func(data)`
    - `data` data received from peer
- `conn` - is a [Connection](https://github.com/libp2p/interface-connection) object
- `p` - instance of [pull-pushable](https://github.com/pull-stream/pull-pushable)

#### `messenger.send_msg(msg,p)`
- `msg` - text to send (string)
- `p` - instance of [pull-pushable](https://github.com/pull-stream/pull-pushable)

## Example
[test.js](https://github.com/MoonSHRD/core/blob/master/messaging/test.js)

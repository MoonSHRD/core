const ethers = require('ethers');
const bip39 = require('bip39');

function Ether() {
    this.generate_mnemonic=function(){
        return bip39.generateMnemonic();
    };

    this.generate_account=function (text) {
        let account;
        if (text) {
            account=ethers.Wallet.fromMnemonic(text);
        } else {
            account=ethers.Wallet.createRandom();
        }
        return account;
    };

    this.generate_priv_key=function () {
        return this.generate_account().privateKey;
    };

}

module.exports = new Ether();

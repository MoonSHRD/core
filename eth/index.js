const ethers = require('ethers');
const bip39 = require('bip39');

function Ether() {
    this.generate_mnemonic = function () {
        return bip39.generateMnemonic();
    };

    this.generate_account = function (text) {
        let account;
        if (text) {
            account = ethers.Wallet.fromMnemonic(text);
        } else {
            account = ethers.Wallet.createRandom();
        }
        return account;
    };

    this.generate_priv_key = function () {
        return this.generate_account().privateKey;
    };

    this.generate_address = function (privKey) {
        let account = new ethers.Wallet(privKey);
        return account.address.toLowerCase();
    }
}

module.exports = new Ether();

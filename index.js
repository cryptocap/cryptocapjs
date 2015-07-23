// Required Libraries
var util = require('util');
var events = require('events');
var io = require('socket.io-client');
var jscrypto = require('jsrsasign');

function CryptoCapital (cfg) {

    var self = this;

    var CRYPTOCAP_API = 'https://api.cryptocapital.co';

    // Setup Event Emitter
    events.EventEmitter.call(this);

    // Configuration
    this.debug = typeof cfg.debug !== undefined ? cfg.debug : false;
    this.cckey = cfg.key;
    this.ccpub = cfg.pub; 

    // Open Socket
    this.socket = io(CRYPTOCAP_API);

    // Socket Event Listeners
    this.socket.on('connect', function () {
        self.emit('connect');
    });
    
    this.socket.on('ack', function (data) {
        self.emit('ack', JSON.parse(data));
    });

    this.socket.on('err', function (data) {
        self.emit('err', JSON.parse(data));
    });

    this.socket.on('error', function (data) {
        self.emit('error', JSON.parse(data));
    });

    this.socket.on('transfer', function (data) {
        self.emit('transfer', JSON.parse(data));
    });

    this.socket.on('account', function (data) {
        self.emit('account', JSON.parse(data));
    });

}

util.inherits(CryptoCapital, events.EventEmitter);

CryptoCapital.prototype.generate = function (callback) {

    var ec = new jscrypto.ECDSA({"curve": 'secp256k1'});
    var keypair = ec.generateKeyPairHex();

    var cckey = new Buffer(keypair.ecprvhex, 'hex').toString('base64');
    var ccpub = new Buffer(keypair.ecpubhex, 'hex').toString('base64');
 
    callback({ 'key' : cckey, 'pub': ccpub });

};

CryptoCapital.prototype.auth = function (args, callback) {

    var self = this;

    var msg = { apiVersion: 2, 
                key: self.ccpub, 
                nonce: Date.now(),
                params: args };
    msg.signed = doSign(self.cckey, 'AUTH' + msg.key.toString() + msg.nonce.toString());
    self.socket.emit('auth', JSON.stringify(msg));
    callback(msg);

};

CryptoCapital.prototype.transfer = function (args, callback) {

    var self = this;

    var msg = { apiVersion: 2, 
                key: self.ccpub, 
                nonce: Date.now(),
                params: args };
    msg.signed = doSign(self.cckey, 'TRANSFER' + msg.key.toString() + msg.nonce.toString() + args.accountNumber.toString() + args.beneficiary.toString() + args.currency.toString() + args.amount.toString());
    self.socket.emit('transfer', JSON.stringify(msg));
    callback(msg);

};

CryptoCapital.prototype.statement = function (args, callback) {

    var self = this;

    var msg = { apiVersion: 2, 
                key: self.ccpub, 
                nonce: Date.now(),
                params: args };
    msg.signed = doSign(self.cckey, 'STATEMENT' + msg.key.toString() + msg.nonce.toString() + args.accountNumber.toString());
    self.socket.emit('statement', JSON.stringify(msg));
    callback(msg);

};

CryptoCapital.prototype.account = function (args, callback) {

    var self = this;

    var msg = { apiVersion: 2, 
                key: self.ccpub, 
                nonce: Date.now(),
                params: args };
    msg.signed = doSign(self.cckey, 'ACCOUNT' + msg.key.toString() + msg.nonce.toString() + args.accountNumber.toString());
    self.socket.emit('account', JSON.stringify(msg));
    callback(msg);

};

module.exports = CryptoCapital;

function doSign(prvkey, message) {

  var hexkey = new Buffer(prvkey, 'base64').toString('hex');

  var curve = 'secp256k1';
  var sigalg = 'SHA256withECDSA';

  var sig = new KJUR.crypto.Signature({"alg": sigalg, "prov": "cryptojs/jsrsa"});
  sig.initSign({'ecprvhex': hexkey, 'eccurvename': curve});
  sig.updateString(message);
  var sigValueHex = sig.sign();
  
  return new Buffer(sigValueHex, 'hex').toString('base64');

}

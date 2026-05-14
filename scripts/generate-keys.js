import crypto from 'crypto';

console.log('\n🔐 Generating Security Keys\n');
console.log('JWT Secret:');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('\nJWT Refresh Secret:');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('\nEncryption Key:');
console.log(crypto.randomBytes(16).toString('hex'));
console.log('\n✅ Copy these to your .env file\n');


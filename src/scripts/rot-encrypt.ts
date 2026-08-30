import { decrypt, encrypt } from "../rotcrypt";

// usage: node rotcrypt.js rot input
// example: node rotcrypt.js e 10 "my token here"
// example: node rotcrypt.js d 10 "ENC(my encrypted token here)"
if (process.argv.length > 2) {
    const fn = process.argv[2] === "e" ? encrypt : decrypt;
    console.log(fn(process.argv[4], Number(process.argv[3])));
}

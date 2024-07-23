const crypto = require("crypto");

// Generate the key and iv values
const key = Buffer.from(
   "5b3860b300b6fc330c4f8f526a1f42f4005c1ad8545280a091a89a88f41c76f0",
   "hex"
);
// console.log(key.toString("hex"));
const iv = Buffer.from("c40171b74ae7970d819a05dae1b55422", "hex");
// console.log(iv.toString("hex"));
// Export the key and iv as constants
module.exports = {
   key,
   iv,
};

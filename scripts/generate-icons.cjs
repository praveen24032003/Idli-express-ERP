const sharp = require("sharp");
const fs = require("fs");

const svg = fs.readFileSync("public/icons/icon.svg");

Promise.all(
  [192, 512].map((s) => sharp(svg).resize(s, s).png().toFile(`public/icons/icon-${s}.png`)),
)
  .then(() => console.log("done"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

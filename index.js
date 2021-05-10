const plist = require("plist");
const fs = require("fs");
const sharp = require('sharp');
const { AutoComplete, Select } = require('enquirer');
const progress = require("cli-progress");
const chalk = require("chalk");
const _console = console;
console = require("Console");


(async function() {
  let prompt = new Select({
    name: "action",
    message: "What action would you like to preform?",
    choices: [
      "Split a texture",
      "Merge a texture"
    ]
  });

  let a = await new Promise(function(resolve, reject) {
    prompt.run()
      .then(resolve)
      .catch(reject);
  })

  if (a === "Split a texture") {
    let t = new AutoComplete({
      name: "texture",
      message: "Choose a texture:",
      footer() {
        return "If your texture is not in this list, move both the .png and the .plist files into this directory.";
      },
      choices: getValidTextures()
    });
    let texture = await new Promise(function (resolve, reject) {
      t.run()
        .then(resolve)
        .catch(reject);
    });
    await split(texture);
    process.exit();
  } else {
    let t = new AutoComplete({
      name: "texture",
      message: "Choose a texture:",
      footer() {
        return "If your texture is not in this list, move both the folder named after the sheet you want to merge and the .plist files into this directory.";
      },
      choices: getValidTextures(true)
    });
    let texture = await new Promise(function (resolve, reject) {
      t.run()
        .then(resolve)
        .catch(reject);
    });
    await merge(texture);
  };
})();

async function split(texture) {
  let text = fs.readFileSync(`./${texture}.plist`).toString();
  let start = new Date();
  let count = 0;
  let ps = 0;

  let parsed = plist.parse(text);

  const meta = parsed.metadata;
  const images = parsed.frames;

  const workload = Object.keys(images).length;
  let current = 0;
  let now;

  const [width, height] = parseVal(meta.size);

  if (!fs.existsSync(`./${texture}`)) {
    fs.mkdirSync(`./${texture}`);
  }

  let pbar = new progress.SingleBar({
    format: `Split Progress | {percentage}% \u258F${chalk.hex("#ff4d4d")("{bar}")}\u2595| {value}/{total} Images Processed | Estimated Time Remaining: {etr}`,
    hideCursor: true,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591"
  });
  pbar.start(workload, 0, {
    etr: "Calculating..."
  });

  let int = setInterval(function () {
    ps += (count - ps) / 10;
    count = 0;
  }, 1000);

  for (const img in images) {
    count++;
    now = new Date();
    let time = (now - start) / 1000;
    if (fs.existsSync(`./${texture}/${img}`)) {
      console.warn(`Skipping ${img} because it already exists.`);
      current++;
      continue;
    }
    const pos = parseVal(images[img].textureRect)[0];
    let size = parseVal(images[img].spriteSize);
    if (images[img].textureRotated) {
      size = size.reverse();
    }
    const rect = parseVal(images[img].textureRect)
    await new Promise(function(resolve) {
      sharp(`./${texture}.png`)
        .extract({
          left: rect[0][0],
          top: rect[0][1],
          width: size[0],
          height: size[1]
        })
        .rotate(images[img].textureRotated ? -90 : 0)
        .toFile(`./${texture}/${img}`)
        .then(resolve);
    });
    current++;
    pbar.update(current, {
      etr: (function () {
        let s, m, h;
        s = Math.round((workload - current) / ps);
        if (s > 60) {
          m = (s - (s % 60)) / 60;
          s = s % 60;
          if (m > 60) {
            h = (m - (m % 60)) / 60;
            m = m % 60;
          }
        };
        return `${h ? `${h} hour${h > 1 ? "s" : ""}, ` : ""}${m ? `${m} minute${m > 1 ? "s" : ""}, ` : ""}${s} second${s > 1 ? "s" : ""}`
      })()
    });
  }
  clearInterval(int)
}

async function merge(texture) {
  let text = fs.readFileSync(`./${texture}.plist`).toString();
  let parsed = plist.parse(text);

  const meta = parsed.metadata;
  const images = parsed.frames;

  const dim = parseVal(meta.size);
  
  let out = sharp({
    create: {
      width: dim[0],
      height: dim[1],
      channels: 4,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0
      }
    }
  });
  let composite = [];
  for (const img in images) {
    if (!fs.existsSync(`${texture}/${img}`)) {
      console.error(`Error: Image "${img}" does not exist.`);
      break;
    }
    const pos = parseVal(images[img].textureRect)[0];
    let { data:i } = await new Promise(function (resolve) {
      let temp = sharp(`${texture}/${img}`);
      resetLog(`Loading ${img} ...`)
      if (images[img].textureRotated) {
        resetLog(`Rotating ${img} ...`)
        temp = temp.rotate(90);
      }
      temp.toBuffer({ resolveWithObject: true })
        .then(resolve)
    })
    composite.push({
      input: i,
      left: pos[0],
      top: pos[1]
    });
  }

  if (!fs.existsSync(`./merged`)) {
    fs.mkdirSync(`./merged`);
  }

  resetLog("Merging Texture...")

  out.composite(composite)
    .toFile(`merged/${texture}.png`)
    .then(async function () {
      resetLog(`Merge complete! You can find your file at ./merged/${texture}.png`)
      await new Promise(function(){});
    })
    .catch(_console.log);
}

function parseVal(v) {
  if (!/\{.*\}/.test(v)) return v;
  return JSON.parse(v.replace(/\{/g, "[").replace(/\}/g, "]"))
}

function getDir() {
  return fs.readdirSync(__dirname);
}

function getDirFiles() {
  return getDir().filter(function(f) {
    if (f.match(/.*\..*/)) return true;
  })
}

function getDirFolders() {
  return getDir().filter(function(f) {
    if (!f.match(/.*\..*/)) return true;
  })
}

function getValidTextures(merge = false) {
  let f;
  if (merge) {
    f = getDirFolders().filter(function (folder) {
      if (getDirFiles().includes(`${folder}.plist`)) return true;
    });
  } else {
    f = getDirFiles().filter(function(e, i, a) {
      if (!e.match(/(.*)\.png/)) return false;
      let n = e.replace(/(.*)\.png/g, "$1");
      if (!a.includes(`${n}.plist`)) return false;
      return true;
    });
  }
  return f.map(function(t) {
    return t.replace(/(.*)\.png/g, "$1");
  });
}

function resetLog (a) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(a);
}
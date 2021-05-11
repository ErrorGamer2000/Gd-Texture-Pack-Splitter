/**
 * Before you start going through my code, I want to apologize for my messy code style.
 * I tried to make this as readable as possible and add helpful comments.
 */

/*Core modules*/
const plist = require("plist");/*Plist module:
    Plist files are Mac OS X files written in XML.
    The Geometry Dash split commands are in .plist files.*/

const fs = require("fs"); //File system to read local texture files

const sharp = require('sharp'); //Image editing package

/*UI modules*/
const { AutoComplete, Select } = require('enquirer');
const progress = require("cli-progress");
const chalk = require("chalk");
const _console = require("Console");

deleteDir("temp");

Object.defineProperty(Array.prototype, 'chunk', {value: function(n) {
    return Array.from(Array(Math.ceil(this.length/n)), (_,i)=>this.slice(i*n,i*n+n));
}});

//Main function
(async function() {

  //Action Prompt
  let prompt = new Select({
    name: "action",
    message: "What action would you like to preform?",
    choices: [
      "Split a texture",
      "Merge a texture"
    ]
  });

  //Wait for user's input
  let a = await new Promise(function(resolve, reject) {
    prompt.run()
      .then(resolve)
      .catch(reject);
  })

  if (a === "Split a texture") {
    //Split action chosen, lets find the texture!
    let t = new AutoComplete({
      name: "texture",
      message: "Choose a texture:",
      footer() {
        return "If your texture is not in this list, move both the .png and the .plist files into this directory.";
      },
      choices: getValidTextures()
    });

    //Wait for response
    let texture = await new Promise(function(resolve, reject) {
      t.run()
        .then(resolve)
        .catch(reject);
    });

    //Wait for split
    await split(texture);

    //End script
    //process.exit();
  } else {
    //Merge action chosen, lets find the texture!
    let t = new AutoComplete({
      name: "texture",
      message: "Choose a texture:",
      footer() {
        return "If your texture is not in this list, move both the folder named after the sheet you want to merge and the .plist files into this directory.";
      },
      choices: getValidTextures(true)
    });

    //Wait for response
    let texture = await new Promise(function(resolve, reject) {
      t.run()
        .then(resolve)
        .catch(reject);
    });

    //Wait for merge
    await merge(texture);

    //End script
    //process.exit();
  };
})();

async function split(texture) {
  let text = fs.readFileSync(`./${texture}.plist`).toString(); //Read the .plist file for the texture

  let count = 0; //Completed images (in the past second) - Only for ETA
  let ps = 0; //Approximate images/second - Only for ETA

  let parsed = plist.parse(text); //Turn the .plist file into a much more usable object

  const meta = parsed.metadata; //Metadata defs
  const images = parsed.frames; //Image data

  const workload = Object.keys(images).length; //Total image count
  let current = 0; //Current package
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

  let int = setInterval(function() {
    ps += (count - ps) / 10;
    count = 0;
  }, 1000);

  for (const img in images) {
    count++;
    if (fs.existsSync(`./${texture}/${img}`)) {
      _console.warn(`Skipping ${img} because it already exists.`);
      current++;
      count--; //Shouldn't count as being processed...
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
      etr: (function() {
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
  
  let composite = [];
  for (const img in images) {
    if (!fs.existsSync(`${texture}/${img}`)) {
      _console.error(`Error: Image "${img}" does not exist.`);
      return false;
    }
    const pos = parseVal(images[img].textureRect)[0];
    let { data: i } = await new Promise(function(resolve) {
      let temp = sharp(`${texture}/${img}`);
      resetLog(`Loading ${img} ...`)
      if (images[img].textureRotated) {
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

  if (!fs.existsSync(`./temp`)) {
    fs.mkdirSync(`./temp`);
  }

  resetLog("Merging Texture...");
  
  const workload = Object.keys(images).length; //Total image count
  current = 0;

  await new Promise(function (resolve) {
    sharp({
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
    })
      .toFile("./temp/temp-a.png")
      .then(resolve);
  });
  let even = true;
  for (const group of composite.chunk(10)) {
    let first = current + 1;
    current += group.length;
    resetLog(`Compositing images ${first} to ${current} of ${workload}`);
    await new Promise(function (resolve, reject) {
      let temp = sharp(`./temp/temp${even ? "-a" : "-b"}.png`);
      temp.composite(group)
        .toFile(`./temp/temp${!even ? "-a" : "-b"}.png`)
        .then(function () {
          deleteFile(`./temp/temp${even ? "-a" : "-b"}.png`);
          even = !even
          resolve();
        });
    })
  }

  fs.writeFileSync(`./merged/${texture}.png`, fs.readFileSync(`./temp/temp${even ? "-a" : "-b"}.png`));
  deleteDir("./temp");
  resetLog(`Merge finished! You can find you file at merged/${texture}.png`);
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
    f = getDirFolders().filter(function(folder) {
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

function resetLog(a) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(a);
}

function deleteDir(d, oe = console.log) {
  try {
    fs.rmdirSync(d, { recursive: true });
  } catch (e) {
    oe(e)
  }
}

function deleteFile(d, oe = console.log) {
  try {
    fs.unlinkSync(d);
  } catch (e) {
    oe(e)
  }
}
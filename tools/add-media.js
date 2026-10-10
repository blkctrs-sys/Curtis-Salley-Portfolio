#!/usr/bin/env node
// Adds a new image or video to the portfolio.
//
//   node tools/add-media.js                     (asks about every file in the inbox)
//   node tools/add-media.js "path/to/file.mp4" --section blender --caption "The Loft"
//
// What it does: compresses the file for the web, makes a thumbnail for videos, copies it into
// media/<section>/, adds it to the top of media/gallery.json, and (if you say yes) publishes it.
// The original is moved to portfolio-media/originals so nothing is lost.

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execFileSync, spawnSync } = require('child_process');

const SITE = path.resolve(__dirname, '..');
const MEDIA_HOME = path.resolve(SITE, '..', 'portfolio-media');
const INBOX = path.join(MEDIA_HOME, 'inbox');
const ORIGINALS = path.join(MEDIA_HOME, 'originals');
const GALLERY = path.join(SITE, 'media', 'gallery.json');
const SECTIONS = ['unreal', 'blender', 'music'];
const VIDEO = /\.(mp4|mov|mkv|webm|avi|m4v)$/i;
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

function findTool(name) {
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  if (which.status === 0) return which.stdout.split(/\r?\n/)[0].trim();
  const pkgs = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(pkgs)) {
    for (const dir of fs.readdirSync(pkgs).filter((d) => d.startsWith('Gyan.FFmpeg'))) {
      const root = path.join(pkgs, dir);
      for (const build of fs.readdirSync(root)) {
        const exe = path.join(root, build, 'bin', name + '.exe');
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  throw new Error(`Couldn't find ${name}. Install it with: winget install Gyan.FFmpeg`);
}

const slugify = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';

function ask(rl, q, def) {
  return new Promise((res) => rl.question(def ? `${q} [${def}]: ` : `${q}: `, (a) => res(a.trim() || def || '')));
}

function parseArgs(argv) {
  const out = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
    else out.files.push(argv[i]);
  }
  return out;
}

function addOne(file, { section, caption, description }) {
  const ffmpeg = findTool('ffmpeg'), ffprobe = findTool('ffprobe');
  const isVideo = VIDEO.test(file);
  const outDir = path.join(SITE, 'media', section);
  fs.mkdirSync(outDir, { recursive: true });
  let slug = slugify(caption || path.parse(file).name);
  while (fs.existsSync(path.join(outDir, slug + (isVideo ? '.mp4' : path.extname(file).toLowerCase())))) slug += '-2';

  const item = { section, type: isVideo ? 'video' : 'image', caption: caption || '', description: description || '', added: new Date().toISOString().slice(0, 10) };
  if (isVideo) {
    const out = path.join(outDir, slug + '.mp4');
    // Renders keep 1080p; everything else goes to 720p. Longest side is capped either way.
    const max = section === 'blender' ? 1920 : 1280;
    const crf = section === 'blender' ? '23' : '26';
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', file, '-vf', `scale='if(gt(iw,ih),min(${max},iw),-2)':'if(gt(iw,ih),-2,min(${max},ih))',format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], { stdio: 'inherit' });
    const dur = parseFloat(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf8' })) || 1;
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-ss', String(Math.min(3, dur * 0.3).toFixed(2)), '-i', out, '-frames:v', '1',
      '-vf', "scale='if(gt(iw,ih),720,-2)':'if(gt(iw,ih),-2,720)'", '-q:v', '4', path.join(outDir, slug + '.jpg')], { stdio: 'inherit' });
    item.src = `media/${section}/${slug}.mp4`;
    item.poster = `media/${section}/${slug}.jpg`;
    const mb = (fs.statSync(out).size / 1048576).toFixed(1);
    console.log(`  ✓ Compressed to ${mb} MB${mb > 50 ? '  ⚠ that is large; consider trimming it' : ''}`);
  } else {
    const ext = path.extname(file).toLowerCase() === '.png' ? '.png' : '.jpg';
    const out = path.join(outDir, slug + ext);
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', file, '-vf', "scale='min(1600,iw)':-2", ...(ext === '.jpg' ? ['-q:v', '3'] : []), out], { stdio: 'inherit' });
    item.src = `media/${section}/${slug}${ext}`;
    console.log('  ✓ Image resized');
  }

  const g = JSON.parse(fs.readFileSync(GALLERY, 'utf8'));
  g.items.unshift(item);
  fs.writeFileSync(GALLERY, JSON.stringify(g, null, 2) + '\n');

  fs.mkdirSync(ORIGINALS, { recursive: true });
  if (path.resolve(path.dirname(file)) === path.resolve(INBOX)) fs.renameSync(file, path.join(ORIGINALS, path.basename(file)));
  console.log(`  ✓ Added to the ${section} page as "${item.caption || '(no caption)'}"`);
  return item;
}

function publish(items) {
  const git = (...a) => execFileSync('git', a, { cwd: SITE, stdio: 'inherit' });
  git('add', 'media');
  git('commit', '-m', `Add ${items.map((i) => i.caption || path.basename(i.src)).join(', ')}`);
  git('push');
  console.log('\nPublished. It will be live at https://citruscreativity.studio in a minute or two.');
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let files = args.files;
  if (!files.length) {
    fs.mkdirSync(INBOX, { recursive: true });
    files = fs.readdirSync(INBOX).filter((f) => VIDEO.test(f) || IMAGE.test(f)).map((f) => path.join(INBOX, f));
    if (!files.length) { console.log(`Nothing to add. Put files in ${INBOX} first.`); rl.close(); return; }
  }
  const added = [];
  for (const file of files) {
    console.log(`\n${path.basename(file)}`);
    let section = (args.section || '').toLowerCase();
    while (!SECTIONS.includes(section)) section = (await ask(rl, '  Section (unreal / blender / music)', /music|beat/i.test(file) ? 'music' : 'blender')).toLowerCase();
    const caption = args.caption ?? await ask(rl, '  Caption (shown under the thumbnail)', '');
    const description = args.description ?? await ask(rl, '  Description (optional)', '');
    added.push(addOne(file, { section, caption, description }));
  }
  const go = (await ask(rl, '\nPublish to the live site now? (y/n)', 'y')).toLowerCase().startsWith('y');
  rl.close();
  if (go) publish(added); else console.log('Saved locally. Run `git push` from the portfolio folder when ready.');
})().catch((e) => { console.error('\n✗ ' + e.message); process.exit(1); });

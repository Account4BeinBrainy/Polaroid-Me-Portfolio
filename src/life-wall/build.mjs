import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({absWorkingDir:fileURLToPath(new URL('.',import.meta.url)),entryPoints:['entry.jsx'],bundle:true,external:['/js/viewport-images.js*'],minify:true,format:'esm',outfile:'../../dist/js/life-wall.js'});

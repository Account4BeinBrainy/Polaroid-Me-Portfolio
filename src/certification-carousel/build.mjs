import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({absWorkingDir:fileURLToPath(new URL('.',import.meta.url)),entryPoints:['entry.jsx'],external:['three','three/*','/js/*','/portfolio-navigation.js*'],jsx:'automatic',bundle:true,minify:true,format:'esm',outfile:'../../dist/js/certification-carousel.js'});

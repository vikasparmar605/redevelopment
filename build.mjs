import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const result=await build({entryPoints:['src/main.js'],bundle:true,format:'iife',minify:true,write:false,target:['es2020'],legalComments:'eof'});
let html=await readFile('src/index.html','utf8');
const css=await readFile('src/style.css','utf8');
const image=async p=>'data:image/png;base64,'+(await readFile(p)).toString('base64');
html=html.replace('/*STYLE*/',css).replace('/*SCRIPT*/',()=>result.outputFiles[0].text.replaceAll('</script','<\\/script')).replaceAll('__PLAN_IMAGE__',await image('assets/floor-plan.png')).replaceAll('__INTERIOR_IMAGE__',await image('assets/interior-reference.png'));
await mkdir('dist',{recursive:true});await writeFile('dist/index.html',html);await writeFile('My Home 3D.html',html);
console.log('Built standalone browser model: '+(html.length/1024/1024).toFixed(2)+' MB');

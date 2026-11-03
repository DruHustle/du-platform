import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const checker=fileURLToPath(new URL("../check-architecture.mjs",import.meta.url));
async function fixture() {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"du-architecture-"));
 for(const name of ["du-platform-frontend/web","du-platform-frontend/mobile","du-platform-backend"]){const app=path.join(root,name);await fs.mkdir(app,{recursive:true});await fs.writeFile(path.join(app,"package.json"),JSON.stringify({dependencies:{react:"1.0.0"}}));await fs.writeFile(path.join(app,name.endsWith("mobile")?"package-lock.json":"pnpm-lock.yaml"),"");await fs.writeFile(path.join(app,".env.example"),"");}
 return root;
}
function run(root){return spawnSync(process.execPath,[checker],{cwd:root,encoding:"utf8"});}
test("accepts independent application inputs",async()=>{const root=await fixture();try{assert.equal(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}});
test("rejects a cross-project source import",async()=>{const root=await fixture();try{await fs.writeFile(path.join(root,"du-platform-frontend/web/app.ts"),'import "../../mobile/app";');assert.notEqual(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}});
test("rejects local dependency links and escaping compiler aliases",async()=>{const root=await fixture();try{const app=path.join(root,"du-platform-backend");await fs.writeFile(path.join(app,"package.json"),JSON.stringify({dependencies:{web:"file:../du-platform-frontend/web"}}));assert.notEqual(run(root).status,0);await fs.writeFile(path.join(app,"package.json"),"{}");await fs.writeFile(path.join(app,"tsconfig.json"),JSON.stringify({compilerOptions:{paths:{"@shared/*":["../shared/*"]}}}));assert.notEqual(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}});
test("rejects extra repository-root files or folders",async()=>{const root=await fixture();try{await fs.writeFile(path.join(root,"unexpected.txt"),"stray");assert.notEqual(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}});

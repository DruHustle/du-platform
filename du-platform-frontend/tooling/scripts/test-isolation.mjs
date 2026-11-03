import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=process.cwd();
const temp=await fs.mkdtemp(path.join(os.tmpdir(),"du-isolated-apps-"));
const skip=new Set(["node_modules","dist",".expo",".git","Pods",".gradle","build",".DS_Store",".local-root",".cert",".claude"]);
const apps=[
  {name:"web",src:"du-platform-frontend/web",commands:[["pnpm",["install","--frozen-lockfile","--ignore-scripts"]],["pnpm",["check"]],["pnpm",["build"]]]},
  {name:"backend",src:"du-platform-backend",commands:[["pnpm",["install","--frozen-lockfile","--ignore-scripts"]],["pnpm",["check"]],["pnpm",["build"]]]},
  {name:"mobile",src:"du-platform-frontend/mobile",commands:[["npm",["ci","--no-audit","--no-fund"]],["npm",["run","check"]],["npm",["test"]],["npm",["run","build"]]]},
];
try {
  for(const app of apps){
    const target=path.join(temp,app.name);
    await fs.cp(path.join(root,app.src),target,{recursive:true,filter:source=>!skip.has(path.basename(source))&&!/^\.env(?:\.|$)/.test(path.basename(source))||path.basename(source)===".env.example"});
    for (const privateName of [".env", ".local-root", ".cert", ".claude"]) {
      try { await fs.access(path.join(target,privateName)); throw new Error(`${app.name}: copied private local data: ${privateName}`); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    for(const [command,args] of app.commands){
      console.log(`[isolation] ${app.name}: ${command} ${args.join(" ")}`);
      const result=spawnSync(command,args,{cwd:target,stdio:"inherit",env:{...process.env,DU_CATALOGUE_STRATEGY:"omit",EXPO_OFFLINE:"1",EXPO_NO_TELEMETRY:"1",CI:"1"}});
      if(result.error)throw result.error;
      if(result.status!==0)throw new Error(`${app.name}: ${command} exited ${result.status}`);
    }
  }
  console.log("[isolation] All three applications installed and built without sibling source directories.");
} finally { await fs.rm(temp,{recursive:true,force:true}); }

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { inspectPronunciationWav } from "@/src/lib/pronunciation-wav";
import { isReviewDecision } from "@/src/lib/pronunciation-review";
import { PronunciationWorkflowStore } from "./workflow-store";

export async function saveWorkflowReview(store: PronunciationWorkflowStore, key: string, sha256: string, decision: unknown, note: unknown) {
  if (!/^[a-f0-9]{64}$/.test(key) || !/^[a-f0-9]{64}$/.test(sha256) || !isReviewDecision(decision) || typeof note !== "string" || note.length > 2000) throw new Error("Invalid review decision");
  const signal = inspectPronunciationWav(await readFile(join(store.dir, "audio", `${key}.wav`)));
  if (signal.sha256 !== sha256) throw new Error("Recording changed; regenerate and review the new file");
  store.review(key, sha256, decision, note.trim());
}

function reviewPage(locale: string, copy: Record<string, string>, token: string) {
  const strings = JSON.stringify(copy).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.title}</title>
<style>:root{color-scheme:light dark;font-family:system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:light-dark(#f8eeeb,#211817);color:light-dark(#302622,#f1e9e6)}main{max-width:1152px;margin:auto;padding:24px}h1{font-size:clamp(1.6rem,5vw,2.3rem);margin:0 0 12px}h2{margin:0;font-size:1.55rem;overflow-wrap:anywhere}p{line-height:1.5}.surface{background:light-dark(#ffffff66,#15121266);border:1px solid light-dark(#ddc9c2,#58403b);border-radius:12px;padding:16px}.controls{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:20px 0}.field{display:grid;gap:6px;font-size:.9rem;min-width:0}.field>input,.field>select{width:100%;min-width:0}.controls>label:not(.field){display:flex;align-items:center;gap:8px;min-height:44px;font-size:.9rem}.controls input[type=checkbox]{min-height:0;margin:0;width:18px;height:18px;flex-shrink:0;accent-color:#992719}button,select,input,textarea{font:inherit;color:inherit;background:light-dark(#fff8,#20181888);border:1px solid light-dark(#c6aba1,#76534a);border-radius:8px}button,select,input{min-height:44px;padding:8px 12px}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}button.approve{background:#992719;color:#fff;border-color:#992719}button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #c54b37;outline-offset:3px}a{color:light-dark(#992719,#ffb1a2)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:16px}.card{display:grid;gap:12px;align-content:start}.meta{font-size:.85rem;opacity:.8}.flags{color:light-dark(#92291d,#ffb6a8);font-size:.85rem}.actions{display:flex;flex-wrap:wrap;gap:8px}textarea{padding:10px;width:100%;min-height:70px;resize:vertical}audio{width:100%;min-width:0}#summary{line-height:1.6}#notice{min-height:24px}.pager{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:20px}@media(max-width:480px){main{padding:16px}.controls>.field{flex:1;min-width:130px}}</style>
<main><h1>${copy.title}</h1><p>${copy.intro}</p><div class="surface" id="summary" aria-live="polite"></div><div class="controls"><label class="field">${copy.filter}<select id="decision"><option value="unreviewed">${copy.unreviewed}</option><option value="approved">${copy.approved}</option><option value="rejected">${copy.rejected}</option><option value="deferred">${copy.deferred}</option><option value="all">${copy.all}</option></select></label><label class="field">${copy.batch}<input id="batch" type="number" min="1" placeholder="${copy.all}"></label><label><input type="checkbox" id="attention"> ${copy.attentionOnly}</label><button id="refresh">${copy.refresh}</button><a href="?locale=${locale === "tr" ? "en" : "tr"}">${locale === "tr" ? "English" : "Türkçe"}</a></div><p id="notice" role="status"></p><div class="grid" id="cards"></div><div class="pager"><button id="previous">${copy.previous}</button><span id="page"></span><button id="next">${copy.next}</button></div></main>
<script>const t=${strings};const token=${JSON.stringify(token)};let offset=0,total=0,loadVersion=0;const byId=id=>document.getElementById(id);const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el};const flags={circumflex:t.circumflex,singleCharacter:t.singleCharacter,veryShort:t.veryShort,shortAudio:t.shortAudio,longAudio:t.longAudio,lostCircumflex:t.lostCircumflex};
async function json(url,options){const response=await fetch(url,options);const data=await response.json();if(!response.ok)throw new Error(data.error||t.error);return data}
async function load(){const version=++loadVersion;byId('refresh').disabled=true;try{const query=new URLSearchParams({decision:byId('decision').value,attention:String(byId('attention').checked),offset:String(offset)});if(byId('batch').value)query.set('batch',byId('batch').value);const [data,status]=await Promise.all([json('/api/assets?'+query),json('/api/status')]);if(version!==loadVersion)return;total=data.total;if(offset>=total&&total){offset=Math.floor((total-1)/30)*30;return load()}if(!total)offset=0;byId('summary').textContent=t.generated+': '+status.assets.generated+' / '+status.assets.total+' · '+t.entries+': '+status.entries+' · '+t.approved+': '+(status.reviews.find(r=>r.decision==='approved')?.count||0)+' · '+t.pendingReview+': '+(status.reviews.find(r=>r.decision==='unreviewed')?.count||0)+' · '+t.nextBatch+': '+(status.nextBatch??t.complete)+' · '+(status.reviewPolicy?.mode==='approve-unflagged'?t.automaticApproval:t.manualApproval);byId('cards').replaceChildren();for(const row of data.rows){const card=text('article','','card surface');card.append(text('h2',row.headword));card.append(text('div',t.entryIds+': '+row.entryIds.join(', ')+' · '+t.batch+' '+row.batch,'meta'));card.append(text('div',t[row.decision],'meta'));if(row.flags.length)card.append(text('div',row.flags.map(f=>flags[f]||f).join(' · '),'flags'));const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src='/media/'+row.key+'.wav';audio.setAttribute('aria-label',t.listen+' '+row.headword);card.append(audio);card.append(text('div',t.ai+' · '+row.duration.toFixed(2)+'s · '+t.seed+' '+row.seed+' · '+t.speed+' '+row.speed,'meta'));const note=document.createElement('textarea');note.value=row.note;note.maxLength=2000;note.setAttribute('aria-label',t.note+' '+row.headword);note.placeholder=t.note;card.append(note);const actions=text('div','','actions');for(const [decision,label]of [['approved',t.approve],['rejected',t.reject],['deferred',t.defer],['unreviewed',t.reset]]){const button=text('button',label,decision==='approved'?'approve':'');button.addEventListener('click',async()=>{for(const b of actions.querySelectorAll('button'))b.disabled=true;try{await json('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':token},body:JSON.stringify({key:row.key,sha256:row.sha256,decision,note:note.value})});byId('notice').textContent=t.saved+' '+row.headword;await load()}catch(error){byId('notice').textContent=t.error+': '+error.message}finally{for(const b of actions.querySelectorAll('button'))b.disabled=false}});actions.append(button)}card.append(actions);byId('cards').append(card)}if(!data.rows.length)byId('cards').append(text('p',t.empty));byId('page').textContent=total?Math.min(offset+1,total)+'–'+Math.min(offset+30,total)+' / '+total:'0 / 0';byId('previous').disabled=offset===0;byId('next').disabled=offset+30>=total}catch(error){if(version===loadVersion)byId('notice').textContent=t.error+': '+error.message}finally{if(version===loadVersion)byId('refresh').disabled=false}}
for(const id of ['decision','attention','batch'])byId(id).addEventListener('change',()=>{offset=0;load()});byId('refresh').addEventListener('click',()=>load());byId('previous').addEventListener('click',()=>{offset=Math.max(0,offset-30);load()});byId('next').addEventListener('click',()=>{offset+=30;load()});document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO')for(const player of document.querySelectorAll('audio'))if(player!==event.target)player.pause()},true);load();</script></html>`;
}

export async function startWorkflowReviewServer(store: PronunciationWorkflowStore, port: number) {
  const token = randomBytes(24).toString("hex");
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const host = request.headers.host ?? "";
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    const allowed = [`localhost:${actualPort}`, `127.0.0.1:${actualPort}`];
    const json = (status: number, value: unknown) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(value)); };
    if (!allowed.includes(host)) return json(403, { error: "Only loopback access is allowed" });
    const url = new URL(request.url ?? "/", `http://${host}`);
    try {
      if (request.method === "GET" && url.pathname === "/") {
        const locale = url.searchParams.get("locale") === "en" ? "en" : "tr";
        const messages = JSON.parse(await readFile(resolve("messages", `${locale}.json`), "utf8"));
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
        return response.end(reviewPage(locale, messages.PronunciationWorkflow, token));
      }
      if (request.method === "GET" && url.pathname === "/api/status") return json(200, store.status());
      if (request.method === "GET" && url.pathname === "/api/assets") {
        const decision = url.searchParams.get("decision") ?? "unreviewed";
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const batch = url.searchParams.has("batch") ? Number(url.searchParams.get("batch")) : undefined;
        if ((decision !== "all" && !isReviewDecision(decision)) || !Number.isSafeInteger(offset) || offset < 0 || (batch !== undefined && (!Number.isSafeInteger(batch) || batch < 1))) throw new Error("Invalid review filter");
        const result = store.list(decision, url.searchParams.get("attention") === "true", offset, 30, batch);
        return json(200, { total: result.total, rows: result.rows.map(row => { const asset = JSON.parse(row.metadata); return { key: row.key, headword: row.headword, sha256: row.sha256, flags: JSON.parse(row.flags), decision: row.decision, note: row.note, entryIds: row.entryIds, batch: row.batch, duration: asset.duration, seed: asset.settings.seed, speed: asset.settings.speed }; }) });
      }
      if (request.method === "GET" && /^\/media\/[a-f0-9]{64}\.wav$/.test(url.pathname)) {
        const key = url.pathname.slice(7, -4);
        if (!store.asset(key)?.sha256) return json(404, { error: "Recording not generated" });
        const bytes = await readFile(join(store.dir, "audio", `${key}.wav`));
        const range = request.headers.range;
        if (range) {
          const match = /^bytes=(\d+)-(\d*)$/.exec(range);
          const start = match ? Number(match[1]) : -1;
          const end = match?.[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
          if (start < 0 || start > end || start >= bytes.length) { response.writeHead(416, { "Content-Range": `bytes */${bytes.length}` }); return response.end(); }
          response.writeHead(206, { "Content-Type": "audio/wav", "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": end - start + 1, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
          return response.end(bytes.subarray(start, end + 1));
        }
        response.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": bytes.length, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
        return response.end(bytes);
      }
      if (request.method === "POST" && url.pathname === "/api/reviews") {
        if (request.headers.origin !== `http://${host}` || request.headers["x-review-token"] !== token || request.headers["content-type"] !== "application/json") return json(403, { error: "Review must originate in the local review page" });
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) { size += chunk.length; if (size > 12000) throw new Error("Review payload too large"); chunks.push(Buffer.from(chunk)); }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        await saveWorkflowReview(store, body.key, body.sha256, body.decision, body.note ?? "");
        return json(200, { saved: true });
      }
      json(404, { error: "Not found" });
    } catch (error) { json(400, { error: (error as Error).message }); }
  });
  await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", accept); });
  return server;
}

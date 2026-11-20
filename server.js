const http=require('http');const {Readable}=require('stream');
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Expose-Headers':'*'};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const drop=new Set(['content-encoding','transfer-encoding','connection','set-cookie','keep-alive']);
http.createServer(async(req,res)=>{
 const self=new URL(req.url,'https://'+req.headers.host);
 if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
 const t=self.searchParams.get('url');
 if(!t){res.writeHead(200,{...cors,'content-type':'text/plain'});return res.end('ok')}
 let tu;try{tu=new URL(t);if(!/^https?:$/.test(tu.protocol))throw 0}catch(e){res.writeHead(400,cors);return res.end('bad url')}
 const ctl=new AbortController();res.on('close',()=>ctl.abort());
 try{
  const h={'user-agent':UA};if(req.headers.range)h.range=req.headers.range;
  const r=await fetch(tu.href,{headers:h,redirect:'follow',signal:ctl.signal});
  const out={};r.headers.forEach((v,k)=>{if(!drop.has(k)&&!k.startsWith('access-control-'))out[k]=v});
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  const enc=r.headers.get('content-encoding');
  if(enc)delete out['content-length'];
  Object.assign(out,cors);
  if(tu.href.includes('.m3u8')||ct.includes('mpegurl')){
   const origin='https://'+req.headers.host;
   const wrap=u=>origin+'/?url='+encodeURIComponent(new URL(u,r.url||tu.href).href);
   let txt=await r.text();
   txt=txt.split('\n').map(l=>{l=l.trim();if(!l)return l;if(l.startsWith('#'))return l.replace(/URI="([^"]+)"/g,(m,u)=>'URI="'+wrap(u)+'"');return wrap(l)}).join('\n');
   delete out['content-length'];out['content-type']='application/vnd.apple.mpegurl';
   res.writeHead(r.status,out);return res.end(txt);
  }
  res.writeHead(r.status,out);
  if(!r.body)return res.end();
  Readable.fromWeb(r.body).on('error',()=>res.destroy()).pipe(res);
 }catch(e){if(!res.headersSent)res.writeHead(502,cors);res.end('proxy error')}
}).listen(process.env.PORT||3000);

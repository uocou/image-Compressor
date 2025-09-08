import { fmtBytes, saveBlob } from './utils.js';

export function buildReportDOM(stats){
    const wrap = document.createElement('div');
    // 汇总
    const kpis = document.createElement('div'); kpis.className='kpis';
    const addKpi=(label,val)=>{ const d=document.createElement('div'); d.className='kpi'; d.innerHTML=`<div>${label}</div><div style="font-size:18px;font-weight:700">${val}</div>`; kpis.appendChild(d); };
    addKpi('总图片数量', stats.total);
    addKpi('原始总大小', fmtBytes(stats.totalIn));
    addKpi('压缩后总大小', fmtBytes(stats.totalOut));
    const saved = stats.totalIn - stats.totalOut;
    const pct = stats.totalIn? ((saved/stats.totalIn)*100).toFixed(1)+'%':'-';
    addKpi('节省总体积', `${fmtBytes(saved)} (${pct})`);
    addKpi('平均压缩比', stats.avgRatio? stats.avgRatio.toFixed(2)+'x' : '-');

    // 表格
    const table = document.createElement('table'); table.className='table';
    table.innerHTML = `<thead>
    <tr><th>#</th><th>文件名</th><th>原始大小</th><th>压缩后</th><th>单张压缩比</th><th>耗时(ms)</th><th>状态</th></tr>
  </thead><tbody></tbody>`;
    stats.items.forEach((it, i)=>{
        const tr=document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td>
      <td>${it.name}</td>
      <td>${fmtBytes(it.inBytes)}</td>
      <td>${fmtBytes(it.outBytes)}</td>
      <td>${it.ratio?it.ratio.toFixed(2)+'x':'-'}</td>
      <td>${it.ms??'-'}</td>
      <td>${it.ok?'成功':'失败'}</td>`;
        table.tBodies[0].appendChild(tr);
    });

    // 简易可视化
    const charts = document.createElement('div'); charts.className='chart-row';
    const bar = document.createElement('canvas'); bar.className='chart'; bar.width=500; bar.height=240;
    const pie = document.createElement('canvas'); pie.className='chart'; pie.width=300; pie.height=240;
    charts.append(bar, pie);
    drawBar(bar.getContext('2d'), stats);
    drawPie(pie.getContext('2d'), stats);

    wrap.append(kpis, charts, table);
    return wrap;
}

function drawBar(ctx, stats){
    const pad=30; const W=ctx.canvas.width; const H=ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg');
    ctx.font='12px ui-sans-serif';
    const xs = stats.items.map((_,i)=>i+1);
    const vals = stats.items.map(it => Math.max(0, (it.inBytes||0)-(it.outBytes||0)));
    const max = Math.max(1, ...vals);
    const bw = (W-pad*2)/vals.length;
    ctx.fillText('各图片节省体积（字节）', pad, 18);
    vals.forEach((v,i)=>{
        const h = (H-pad*2) * (v/max);
        const x = pad + i*bw + 3;
        const y = H - pad - h;
        ctx.fillRect(x,y, Math.max(6,bw-6), h);
    });
}

function drawPie(ctx, stats){
    const saved = Math.max(0, (stats.totalIn||0)-(stats.totalOut||0));
    const used  = stats.totalOut||0;
    const total = Math.max(1, saved+used);
    const cx=ctx.canvas.width/2, cy=ctx.canvas.height/2, r=Math.min(cx,cy)-10;
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    const a1 = (saved/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,0,a1); ctx.closePath(); ctx.fill();
    ctx.globalAlpha=.5;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a1,Math.PI*2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha=1;
    ctx.font='12px ui-sans-serif';
    ctx.fillText('深：节省体积    浅：压缩后体积', 10, 16);
}

export function exportCSV(items){
    const head = ['name','inBytes','outBytes','ratio','ms','ok'];
    const rows = [head.join(',')].concat(items.map(it=>head.map(k=>JSON.stringify(it[k]??'')).join(',')));
    const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8'});
    saveBlob(blob, 'compress-report.csv');
}
export function exportJSON(items){
    const blob = new Blob([JSON.stringify(items,null,2)], {type:'application/json'});
    saveBlob(blob, 'compress-report.json');
}

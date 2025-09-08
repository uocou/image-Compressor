import { el, els, fmtBytes, MAX_FILES, SUPPORTED_EXTS, extOf, mimeFromExt, saveManyAsZip, prefersDark } from './utils.js';
import { mountBeforeAfter, mountMagnifier } from './slider.js';
import { buildReportDOM, exportCSV, exportJSON } from './report.js';

const fileInput  = el('#fileInput');
const dirInput   = el('#dirInput');
const dropzone   = el('#dropzone');
const btnPick    = el('#btnPick');
const btnPickDir = el('#btnPickDir');
const btnClear   = el('#btnClear');
const cardList   = el('#cardList');

const themeSelect= el('#themeSelect');
const outFormat  = el('#outFormat');
const quality    = el('#quality');
const qualityVal = el('#qualityVal');
const targetW    = el('#targetW');
const targetH    = el('#targetH');
const keepAspect = el('#keepAspect');
const preserveMeta = el('#preserveMeta');
const alphaPolicy = el('#alphaPolicy');
const alphaColor  = el('#alphaColor');

const btnStart   = el('#btnStart');
const btnExportZip = el('#btnExportZip');
const btnReport  = el('#btnReport');

const statTotal  = el('#statTotal');
const statQueued = el('#statQueued');
const statRunning= el('#statRunning');
const statDone   = el('#statDone');
const statFail   = el('#statFail');
const barInner   = el('#barInner');

const compareDialog = el('#compareDialog');
const compareSlider = el('#compareSlider');
const btnCloseCompare = el('#btnCloseCompare');
const btnMagnifier = el('#btnMagnifier');
const magnifierDialog = el('#magnifierDialog');
const magnifierWrap = el('#magnifierWrap');

const reportDialog = el('#reportDialog');
const reportContent = el('#reportContent');
const btnCloseReport = el('#btnCloseReport');
const btnExportCSV = el('#btnExportCSV');
const btnExportJSON= el('#btnExportJSON');

const state = {
    items: [], // {id, file, name, size, url, card, outBlob?, outURL?, width,height, ok?, err?, timeMs?}
    queue: [],
    running: 0,
    done: 0,
    fail: 0,
    worker: null,
    reportRows: []
};

// 主题初始化
(function initTheme(){
    const saved = localStorage.getItem('imgc-theme') || 'auto';
    themeSelect.value = saved;
    applyTheme(saved);
    themeSelect.addEventListener('change', ()=>{ localStorage.setItem('imgc-theme', themeSelect.value); applyTheme(themeSelect.value); });
    function applyTheme(mode){
        const html=document.documentElement;
        if(mode==='auto') html.dataset.theme='auto', html.removeAttribute('data-theme');
        else html.dataset.theme=mode, html.setAttribute('data-theme', mode);
    }
})();

quality.addEventListener('input', ()=> qualityVal.textContent=quality.value);

// 添加文件
btnPick.onclick = ()=> fileInput.click();
btnPickDir.onclick = ()=> dirInput.click();
btnClear.onclick = ()=> clearAll();

fileInput.onchange = (e)=> addFiles(e.target.files);
dirInput.onchange  = (e)=> addFiles(e.target.files);

dropzone.addEventListener('dragover', e=>{ e.preventDefault(); dropzone.classList.add('hover'); });
dropzone.addEventListener('dragleave', ()=> dropzone.classList.remove('hover'));
dropzone.addEventListener('drop', e=>{
    e.preventDefault(); dropzone.classList.remove('hover');
    const files = [...(e.dataTransfer.items? Array.from(e.dataTransfer.items).map(i=>i.getAsFile()).filter(Boolean) : e.dataTransfer.files)];
    addFiles(files);
});
window.addEventListener('paste', e=>{
    const files = [...e.clipboardData.files];
    addFiles(files);
});

// 过滤 & 加入列表
function addFiles(files){
    const list = Array.from(files||[]);
    for(const f of list){
        if(!f) continue;
        const ext = extOf(f.name);
        if(!SUPPORTED_EXTS.includes(ext)) continue;
        if(state.items.length >= MAX_FILES) { alert(`最多 ${MAX_FILES} 张。`); break; }
        const id = crypto.randomUUID();
        const url = URL.createObjectURL(f);
        const it = { id, file:f, name:f.name, size:f.size, url };
        state.items.push(it);
        renderCard(it);
    }
    updateStats();
}

function clearAll(){
    for(const it of state.items){ if(it.url) URL.revokeObjectURL(it.url); if(it.outURL) URL.revokeObjectURL(it.outURL); }
    state.items = []; state.queue=[]; state.running=0; state.done=0; state.fail=0; state.reportRows=[];
    cardList.innerHTML=''; updateStats();
}

function renderCard(it){
    const card = document.createElement('div'); card.className='card';
    const thumb = document.createElement('div'); thumb.className='thumb';
    const img = document.createElement('img'); img.src = it.url; thumb.appendChild(img);
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML = `
    <div class="name">${it.name}</div>
    <div class="small">原始大小：${fmtBytes(it.size)}</div>
    <div class="small status" data-id="${it.id}"><span class="badge">等待中</span></div>
  `;
    const actions = document.createElement('div'); actions.className='actions';
    const btnPreview = document.createElement('button'); btnPreview.textContent='对比预览'; btnPreview.disabled=true;
    const btnSave    = document.createElement('button'); btnSave.textContent='保存压缩图'; btnSave.disabled=true;
    btnPreview.onclick = ()=> openCompare(it);
    btnSave.onclick = ()=> {
        const outName = suggestOutName(it);
        downloadOne(it, outName);
    };
    actions.append(btnPreview, btnSave);
    card.append(thumb, meta, actions);
    cardList.appendChild(card);
    it.card = { card, statusEl: meta.querySelector('.status span'), btnPreview, btnSave };
}

function suggestOutName(it){
    const outType = (outFormat.value==='auto')? (it.file.type || mimeFromExt(extOf(it.name))) : outFormat.value;
    const map = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/gif':'gif','image/bmp':'bmp','image/tiff':'tiff' };
    const ext = map[outType] || extOf(it.name) || 'jpg';
    return it.name.replace(/\.[^.]+$/, '') + `.compressed.${ext}`;
}

function updateStats(){
    const total = state.items.length;
    const queued= state.items.filter(x=>!x.ok && !x.err && !x.outBlob && !x.running).length;
    const running = state.items.filter(x=>x.running).length;
    const done = state.items.filter(x=>x.ok).length;
    const fail = state.items.filter(x=>x.err).length;
    statTotal.textContent = total;
    statQueued.textContent= queued;
    statRunning.textContent= running;
    statDone.textContent= done;
    statFail.textContent= fail;
    const pct = total? Math.round((done+fail)/total*100) : 0;
    barInner.style.width = pct+'%';
}

// 压缩启动
btnStart.onclick = ()=> startCompress();
async function startCompress(){
    if(!state.items.length){ alert('请先添加图片'); return; }
    // 配置
    const opts = {
        outType: outFormat.value,
        quality: Number(quality.value),
        targetW: parseInt(targetW.value)||undefined,
        targetH: parseInt(targetH.value)||undefined,
        keepAspect: keepAspect.checked,
        preserveMeta: preserveMeta.checked,
        alphaPolicy: alphaPolicy.value,
        alphaColor: alphaColor.value
    };

    // 建立 worker
    if(!state.worker){
        state.worker = new Worker('./js/worker.js', { type:'module' });
        state.worker.onmessage = onWorkerMsg;
    }

    // 入队
    state.queue = state.items.filter(x=>!x.ok && !x.err).map(x=>x.id);
    schedule(opts);
}

function schedule(opts){
    const parallel = navigator.hardwareConcurrency ? Math.min(4, navigator.hardwareConcurrency) : 2;
    while(state.running < parallel){
        const id = state.queue.shift();
        if(!id) break;
        const it = state.items.find(x=>x.id===id); if(!it) continue;
        runOne(it, opts);
    }
    updateStats();
}

function runOne(it, opts){
    it.running = true;
    it.card.statusEl.textContent='压缩中…';
    it.card.btnPreview.disabled = true;
    it.card.btnSave.disabled = true;
    state.running++;
    state.worker.postMessage({ id: it.id, file: it.file, options: opts });
}

function onWorkerMsg(ev){
    const { id, ok, blob, width, height, timeMs, error } = ev.data;
    const it = state.items.find(x=>x.id===id); if(!it) return;
    it.running=false; state.running--;

    if(ok){
        it.outBlob = blob;
        it.outURL  = URL.createObjectURL(blob);
        it.ok = true; it.timeMs = timeMs; it.width=width; it.height=height;
        it.card.statusEl.textContent = `成功：${fmtBytes(it.size)} → ${fmtBytes(blob.size)}，用时 ${timeMs} ms`;
        it.card.btnPreview.disabled = false;
        it.card.btnSave.disabled = false;
    }else{
        it.err = error || '未知错误';
        it.card.statusEl.textContent = `失败：${it.err}`;
    }

    // 报表行
    state.reportRows.push({
        name: it.name,
        inBytes: it.size,
        outBytes: it.outBlob? it.outBlob.size : 0,
        ratio: it.outBlob? (it.size/Math.max(1,it.outBlob.size)) : 0,
        ms: it.timeMs||0,
        ok: !!it.ok
    });

    updateStats();
    if(state.queue.length) schedule({});
}

function openCompare(it){
    // 并排 + 滑块
    compareDialog.showModal();
    mountBeforeAfter(compareSlider, it.url, it.outURL);
    btnMagnifier.onclick = ()=>{
        magnifierDialog.showModal();
        mountMagnifier(magnifierWrap, it.url, it.outURL);
    };
}
btnCloseCompare.onclick = ()=> compareDialog.close();
btnCloseReport.onclick  = ()=> reportDialog.close();
el('#btnCloseMag').onclick = ()=> magnifierDialog.close();

// 导出 ZIP
btnExportZip.onclick = async ()=>{
    if(!state.items.length) return;
    const map = new Map();
    for(const it of state.items){
        if(it.outBlob){
            const name = suggestOutName(it);
            map.set(name, it.outBlob);
        }
    }
    if(!map.size){ alert('暂无可导出的压缩结果'); return; }
    await saveManyAsZip(map);
};

// 报告
btnReport.onclick = ()=>{
    const {total,totalIn,totalOut,avgRatio,items} = calcStats();
    reportContent.innerHTML='';
    reportContent.append( buildReportDOM({total,totalIn,totalOut,avgRatio,items}) );
    reportDialog.showModal();
};
btnExportCSV.onclick = ()=> exportCSV(state.reportRows);
btnExportJSON.onclick= ()=> exportJSON(state.reportRows);

function calcStats(){
    const items = state.reportRows.slice();
    const total = state.items.length;
    const totalIn  = items.reduce((a,b)=>a+(b.inBytes||0),0);
    const totalOut = items.reduce((a,b)=>a+(b.outBytes||0),0);
    const ratios = items.filter(x=>x.ok && x.outBytes>0).map(x=> x.inBytes/x.outBytes );
    const avgRatio = ratios.length? (ratios.reduce((a,b)=>a+b,0)/ratios.length) : 0;
    return { total,totalIn,totalOut,avgRatio,items };
}

// 质量与透明度选项联动
alphaPolicy.addEventListener('change', ()=>{
    alphaColor.disabled = alphaPolicy.value!=='custom';
});
alphaColor.disabled = alphaPolicy.value!=='custom';

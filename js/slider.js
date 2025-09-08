// 简易 Before/After Slider & 放大镜
export function mountBeforeAfter(container, beforeURL, afterURL){
    container.innerHTML = '';
    const before = document.createElement('div');
    const after  = document.createElement('div');
    before.className='before'; after.className='after';
    const imgB = document.createElement('img'); imgB.src=beforeURL;
    const imgA = document.createElement('img'); imgA.src=afterURL;
    before.appendChild(imgB); after.appendChild(imgA);
    const handle = document.createElement('div'); handle.className='handle';
    const hint   = document.createElement('div'); hint.className='hintline';

    container.append(before, after, handle, hint);

    let pos=.5;
    const layout=()=>{
        const w = container.clientWidth;
        after.style.clipPath = `inset(0 0 0 ${pos*w}px)`;
        handle.style.left = `${pos*100}%`;
        hint.style.left = handle.style.left;
    };
    const drag = (e)=>{
        const rect = container.getBoundingClientRect();
        const x = (e.touches?e.touches[0].clientX:e.clientX) - rect.left;
        pos = Math.min(1, Math.max(0, x/rect.width));
        layout();
    };
    const start = ()=>window.addEventListener('mousemove', drag);
    const end   = ()=>window.removeEventListener('mousemove', drag);
    handle.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', e=>{e.preventDefault(); window.addEventListener('touchmove', drag,{passive:false});});
    window.addEventListener('touchend', ()=>window.removeEventListener('touchmove', drag));
    window.addEventListener('resize', layout);
    layout();
}

export function mountMagnifier(root, beforeURL, afterURL){
    root.innerHTML='';
    const mk = (label, url)=>{
        const wrap = document.createElement('div');
        wrap.className='magnifier';
        const tag = document.createElement('div'); tag.className='label'; tag.textContent=label;
        const cv  = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        wrap.append(tag, cv);
        const img = new Image(); img.src=url;
        img.onload=()=>{
            cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            ctx.drawImage(img,0,0);
            fit();
        };
        return {wrap, cv, ctx};
    };
    const left  = mk('原图', beforeURL);
    const right = mk('压缩后', afterURL);
    root.append(left.wrap, right.wrap);

    function fit(){
        // 画布 CSS 自适应由 CSS 控制；这里仅同步放大镜位置
    }
    let lastX=0,lastY=0, zoom=2;
    function drawZoom(cv, ctx, imgURL, x, y){
        const img = new Image(); img.src=imgURL;
        img.onload=()=>{
            const size = 180;
            // 绘制背景
            ctx.clearRect(0,0,cv.width,cv.height);
            ctx.drawImage(img,0,0);
            // 高亮圆形放大区域
            const sx = Math.max(0, x - size/(2*zoom));
            const sy = Math.max(0, y - size/(2*zoom));
            const sw = Math.min(img.naturalWidth - sx, size/zoom);
            const sh = Math.min(img.naturalHeight - sy, size/zoom);
            const temp = document.createElement('canvas');
            temp.width=size; temp.height=size;
            temp.getContext('2d').drawImage(img, sx, sy, sw, sh, 0,0,size,size);

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, size/2, 0, Math.PI*2);
            ctx.clip();
            ctx.drawImage(temp, x-size/2, y-size/2);
            ctx.restore();

            ctx.strokeStyle='#00a2ff'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI*2); ctx.stroke();
        };
    }
    function onMove(e){
        const any = right.cv.getBoundingClientRect();
        const rx = (e.clientX - any.left) * (right.cv.width/any.width);
        const ry = (e.clientY - any.top ) * (right.cv.height/any.height);
        lastX=rx; lastY=ry;
        drawZoom(left.cv, left.ctx,  beforeURL, rx, ry);
        drawZoom(right.cv, right.ctx, afterURL, rx, ry);
    }
    root.addEventListener('mousemove', onMove);
    window.addEventListener('resize', fit);
}

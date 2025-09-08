// worker.js：接收 {id, file, options}，返回 {id, ok, blob, width,height, timeMs, error}
self.onmessage = async (e)=>{
    const { id, file, options } = e.data;
    const t0 = performance.now();
    try{
        const result = await compressOne(file, options);
        self.postMessage({ id, ok:true, ...result, timeMs: Math.round(performance.now()-t0) });
    }catch(err){
        self.postMessage({ id, ok:false, error: String(err) });
    }
};

async function blobToImageBitmap(blob){
    return await createImageBitmap(blob);
}

async function compressOne(file, opt){
    // 解码
    const ib = await blobToImageBitmap(file);
    const srcW = ib.width, srcH = ib.height;

    // 计算目标尺寸
    let { targetW, targetH, keepAspect=true } = opt;
    if(!targetW && !targetH){ targetW=srcW; targetH=srcH; }
    else if(targetW && !targetH && keepAspect){ targetH = Math.round(srcH * (targetW/srcW)); }
    else if(targetH && !targetW && keepAspect){ targetW = Math.round(srcW * (targetH/srcH)); }

    // 目标 MIME
    let outType = opt.outType==='auto'?'auto':opt.outType;
    if(outType==='auto'){
        // 与原图一致
        outType = file.type || 'image/jpeg';
    }

    // 优先 WebCodecs ImageEncoder
    const hasWebCodecs = 'ImageEncoder' in self;
    const quality = Number(opt.quality || 0.85);
    const off = new OffscreenCanvas(targetW, targetH);
    const ctx = off.getContext('2d', {alpha: true});
    // 透明度策略（转到不支持 alpha 的格式）
    const needsOpaque = !/png|webp|avif/.test(outType) && outType!=='image/png' && outType!=='image/webp' && outType!=='image/avif';
    if(needsOpaque){
        const color = (opt.alphaPolicy==='black')?'#000000'
            : (opt.alphaPolicy==='white')?'#ffffff'
                : (opt.alphaPolicy==='custom'? (opt.alphaColor||'#ffffff') : '#ffffff');
        ctx.fillStyle=color; ctx.fillRect(0,0,targetW,targetH);
    }
    // 绘制缩放
    ctx.drawImage(ib, 0,0, srcW,srcH, 0,0, targetW,targetH);

    // 尝试保留 EXIF（仅 JPEG 且浏览器支持）
    let metadata;
    if(opt.preserveMeta && /jpeg/.test(outType) && file.type==='image/jpeg'){
        try{
            const exif = await extractJpegEXIF(file);
            if(exif) metadata = { exif };
        }catch{}
    }

    if(hasWebCodecs && isEncoderSupported(outType)){
        const blob = await off.convertToBlob({
            type: outType,
            quality: (/png|gif|bmp|tiff/i.test(outType) ? undefined : quality),
            // 一些浏览器会忽略 metadata；传就传，不保证
            // @ts-ignore
            metadata
        });
        return { blob, width:targetW, height:targetH };
    }

    // 回退：toBlob
    const blob = await new Promise((res,rej)=> off.convertToBlob
        ? off.convertToBlob({type: outType, quality: (/png|gif|bmp|tiff/i.test(outType) ? undefined : quality)}).then(res,rej)
        : off.toBlob((b)=>b?res(b):rej('toBlob failed'), outType, (/png|gif|bmp|tiff/i.test(outType) ? undefined : quality)));
    return { blob, width:targetW, height:targetH };
}

// 粗略检测编码支持
function isEncoderSupported(type){
    // 大多数 Chromium 已支持 image/webp、image/avif、image/jpeg、image/png
    return ['image/jpeg','image/png','image/webp','image/avif'].includes(type);
}

// 复制 utils 中的 EXIF 提取（worker 内无模块导入）
async function extractJpegEXIF(blob){
    const buf = new Uint8Array(await blob.arrayBuffer());
    if(buf[0]!==0xFF || buf[1]!==0xD8) return null;
    let i=2;
    while(i+4<buf.length && buf[i]===0xFF){
        const marker = buf[i+1]; const size = (buf[i+2]<<8) | buf[i+3];
        if(marker===0xE1){ return buf.slice(i, i+2+size); }
        if(marker===0xDA) break;
        i += 2 + size;
    }
    return null;
}

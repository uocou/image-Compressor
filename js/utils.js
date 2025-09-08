// 基础工具 & 类型判定
export const MAX_FILES = 20;
export const SUPPORTED_EXTS = ['jpg','jpeg','png','webp','avif','gif','bmp','tif','tiff'];

export function fmtBytes(n){
    if(!isFinite(n)) return '-';
    const u=['B','KB','MB','GB']; let i=0;
    while(n>=1024 && i<u.length-1){ n/=1024; i++; }
    return `${n.toFixed(n<10&&i?2:1)} ${u[i]}`;
}
export const el = (sel, root=document)=>root.querySelector(sel);
export const els= (sel, root=document)=>Array.from(root.querySelectorAll(sel));

export function extOf(name){ const m=name.toLowerCase().match(/\.([a-z0-9]+)$/); return m?m[1]:'';
}
export function mimeFromExt(ext){
    switch(ext){
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'webp': return 'image/webp';
        case 'avif': return 'image/avif';
        case 'gif': return 'image/gif';
        case 'bmp': return 'image/bmp';
        case 'tif': case 'tiff': return 'image/tiff';
        default: return 'application/octet-stream';
    }
}
export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

export function saveBlob(blob, filename){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}

// 简易 ZIP（无第三方库）：使用浏览器 File System Access API 回退下载多文件
export async function saveManyAsZip(filesMap){
    // 优先尝试 showDirectoryPicker（更适合大量文件）
    if('showDirectoryPicker' in window){
        const dirHandle = await window.showDirectoryPicker({mode:"readwrite"});
        for(const [name, blob] of filesMap){
            const fh = await dirHandle.getFileHandle(name, {create:true});
            const ws = await fh.createWritable();
            await ws.write(blob); await ws.close();
        }
        alert('已导出到你选择的文件夹。');
        return;
    }
    // 回退为逐个下载
    for(const [name, blob] of filesMap){ saveBlob(blob, name); await sleep(60); }
    alert('你的浏览器不支持目录写入，已逐个下载。');
}

// 提取 JPEG EXIF（APP1）原始段，用于 WebCodecs metadata 试图保留
export async function extractJpegEXIF(blob){
    const buf = new Uint8Array(await blob.arrayBuffer());
    // SOI 0xFFD8
    if(buf[0]!==0xFF || buf[1]!==0xD8) return null;
    let i=2;
    while(i+4<buf.length && buf[i]===0xFF){
        const marker = buf[i+1]; const size = (buf[i+2]<<8) | buf[i+3];
        if(marker===0xE1){ // APP1
            return buf.slice(i, i+2+size); // 含长度
        }
        if(marker===0xDA) break; // SOS
        i += 2 + size;
    }
    return null;
}

export function prefersDark(){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

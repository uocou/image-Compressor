# Local Image Compressor (Offline / Privacy-Safe)

An open-source, offline image compression tool built with pure HTML, CSS, and JavaScript.  
It runs **entirely in the browser** without uploading files to any server, ensuring **privacy and security**.

---

## ✨ Features

- 🚀 **Fast Compression**: Uses **WebCodecs (if supported)** or Canvas for high performance.
- 📂 **Multiple Import Methods**: File picker, drag & drop, paste from clipboard, or entire folders.
- 📑 **Supported Formats**: JPG/JPEG, PNG, WEBP, AVIF (if supported), GIF (first frame), BMP, TIFF.
- 🔢 **Limit**: Up to **20 images per batch**.
- 🖼️ **Custom Parameters**:
  - Output format
  - Compression quality
  - Resize (keep aspect ratio)
  - Preserve metadata (EXIF, if supported)
  - Transparency handling (remove, black/white background, or custom color)
- 🔒 **Offline & Private**: Works **without internet connection**, all processing is local.
- 📊 **Real-time Progress**: Displays total, queued, running, success, and failed counts.
- 🎨 **Dark / Light Themes**: Manual switch or follow system preference.
- 🔍 **Preview & Compare**:
  - Side-by-side comparison
  - Before/After slider
  - Magnifier view for details
- 📈 **Compression Report**:
  - Summary (total size, savings, average ratio)
  - Per-image details (before/after size, ratio, time, status)
  - Visualization (bar chart, pie chart)
  - Export to CSV / JSON
- 📦 **Batch Export**: Save all compressed images to a folder (via File System Access API) or download one by one.

---

## 🛠 Usage

1. Download or clone this project.  
2. Open `index.html` directly in your browser (no server needed).  
3. Add images via drag & drop, paste, or file picker, then click **Start Compression**.

> ⚠️ Recommended: Use **Chrome / Edge / Opera** (Chromium-based) for best performance.  
> Safari/Firefox may have limited support (e.g., AVIF, metadata retention, batch export).

---



## 📜 License

[MIT License](./LICENSE) – free to use, modify, and distribute with attribution.

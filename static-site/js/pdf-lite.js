/* ================================================================== */
/*  Critical Shot — tiny client-side PDF writer (text, lines, images) */
/*  Produces PDF 1.4 documents using the built-in Helvetica fonts     */
/*  and embedded JPEG images (DCTDecode).                             */
/*  Exposed as CS.pdf.create() / CS.pdf.save()                        */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS = window.CS || {};

  const W = 595.28;   /* A4 portrait, points */
  const H = 841.89;
  const M = 40;       /* default margin */

  /* Load an image (src or <img>) and return a JPEG data URL + natural size.
     Used by callers to pre-render photos before embedding them in a PDF. */
  CS.pdfImage = function (src, maxDim) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          const max = maxDim || 1600;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.round(img.naturalWidth * scale) || 1;
          const h = Math.round(img.naturalHeight * scale) || 1;
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve({ dataUrl: c.toDataURL('image/jpeg', 0.85), width: w, height: h });
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('Could not load image: ' + src)); };
      img.src = src;
    });
  };

  function escText(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x00-\x7f]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) & 0xff);
      });
  }

  function approxWidth(str, size) { return 0.5 * size * String(str).length; }

  /* Read pixel dimensions from a JPEG byte string (SOF marker scan) */
  function jpegSize(binary) {
    let i = 2;
    const n = binary.length;
    while (i < n - 8) {
      if (binary.charCodeAt(i) !== 255) { i++; continue; }
      const marker = binary.charCodeAt(i + 1);
      if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) { i += 2; continue; }
      const len = (binary.charCodeAt(i + 2) << 8) | binary.charCodeAt(i + 3);
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        return {
          height: (binary.charCodeAt(i + 5) << 8) | binary.charCodeAt(i + 6),
          width: (binary.charCodeAt(i + 7) << 8) | binary.charCodeAt(i + 8)
        };
      }
      i += 2 + len;
    }
    return { width: 100, height: 100 };
  }

  function create(name) {
    const pages = [];
    const images = [];
    const imageIndex = {};
    function cur() { return pages[pages.length - 1]; }
    function newPage() { pages.push({ ops: [] }); }

    const doc = {
      name: name || 'document.pdf',
      width: W,
      height: H,
      margin: M,
      pages: pages,

      addPage: function () { newPage(); },

      text: function (str, x, y, opts) {
        const o = opts || {};
        const size = o.size || 12;
        const font = o.bold ? 'F1' : 'F2';
        const col = o.color || [17, 24, 39];
        const clean = escText(str);
        let xx = x;
        if (o.align === 'center') xx = x - approxWidth(str, size) / 2;
        if (o.align === 'right') xx = x - approxWidth(str, size);
        cur().ops.push('BT /' + font + ' ' + size + ' Tf ' +
          (col[0] / 255).toFixed(3) + ' ' + (col[1] / 255).toFixed(3) + ' ' + (col[2] / 255).toFixed(3) + ' rg ' +
          xx.toFixed(2) + ' ' + y.toFixed(2) + ' Td (' + clean + ') Tj ET');
      },

      line: function (x1, y1, x2, y2, lw, color) {
        const c = color || [226, 232, 240];
        cur().ops.push(
          (c[0] / 255).toFixed(3) + ' ' + (c[1] / 255).toFixed(3) + ' ' + (c[2] / 255).toFixed(3) + ' RG ' +
          (lw || 0.5) + ' w ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S');
      },

      /* Filled rectangle. x,y = top-left in text() coordinates. */
      rect: function (x, y, w, h, color) {
        const c = color || [233, 236, 241];
        const yb = y - h;
        cur().ops.push(
          (c[0] / 255).toFixed(3) + ' ' + (c[1] / 255).toFixed(3) + ' ' + (c[2] / 255).toFixed(3) + ' rg ' +
          x.toFixed(2) + ' ' + yb.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f');
      },

      /* Draw a JPEG image. dataUrl should be data:image/jpeg;base64,...
         x,y = top-left in the same coordinates as text(); w,h = points. */
      image: function (dataUrl, x, yTop, w, h) {
        const b64 = String(dataUrl).replace(/^data:image\/[a-z0-9.+-]+;base64,/, '');
        let idx = imageIndex[b64];
        if (idx === undefined) {
          idx = images.length;
          imageIndex[b64] = idx;
          images.push(b64);
        }
        const yb = yTop - h;
        cur().ops.push('q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x.toFixed(2) + ' ' + yb.toFixed(2) + ' cm /Im' + idx + ' Do Q');
      },

      save: function (filename) {
        const outName = filename || doc.name;
        const imgCount = images.length;
        const firstPage = 5 + imgCount * 2;
        const imageObj = function (i) { return 5 + i * 2; };

        const objects = [
          '<< /Type /Catalog /Pages 2 0 R >>',
          '<< /Type /Pages /Count ' + pages.length + ' /Kids [\n' +
            pages.map(function (_, i) { return (firstPage + i * 2) + ' 0 R'; }).join('\n') + '\n] >>',
          '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
          '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
        ];
        images.forEach(function (b64, i) {
          const bin = atob(b64);
          const dim = jpegSize(bin);
          objects.push('<< /Type /XObject /Subtype /Image /Width ' + dim.width + ' /Height ' + dim.height +
            ' /BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /DCTDecode /Length ' + bin.length + ' >>');
          objects.push('stream\n' + bin + '\nendstream');
        });
        pages.forEach(function (p) {
          const pageNum = firstPage + (objects.length - firstPage);
          const contentNum = pageNum + 1;
          let stream = p.ops.join('\n');
          if (stream) stream += '\n';
          let res = '/Font << /F1 3 0 R /F2 4 0 R >>';
          if (images.length) {
            const refs = images.map(function (_, i) { return '/Im' + i + ' ' + imageObj(i) + ' 0 R'; }).join(' ');
            res += ' /XObject << ' + refs + ' >>';
          }
          objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << ' + res + ' >> /Contents ' + contentNum + ' 0 R >>');
          objects.push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream');
        });

        let chunks = ['%PDF-1.4\n'];
        const offsets = [];
        objects.forEach(function (body) {
          offsets.push(lenOf(chunks));
          chunks.push((offsets.length) + ' 0 obj\n' + body + '\nendobj\n');
        });
        const xrefPos = lenOf(chunks);
        let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
        offsets.forEach(function (off) { xref += pad10(off) + ' 00000 n \n'; });
        chunks.push(xref, 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n');

        const out = chunks.join('');
        const bytes = new Uint8Array(out.length);
        for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 800);
      }
    };

    function lenOf(arr) { return arr.reduce(function (n, s) { return n + s.length; }, 0); }
    function pad10(n) { return String(n).padStart(10, '0'); }

    newPage();
    return doc;
  }

  CS.pdf = CS.pdf || {};
  CS.pdf.create = create;
})();
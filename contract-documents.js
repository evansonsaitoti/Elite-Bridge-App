(function () {
  'use strict';
  const form = document.getElementById('contractDocumentForm');
  if (!form) return;
  const base = 'https://elite-bridge-shared-api-evans.vercel.app/api/contract-documents/employer';
  const list = document.getElementById('contractDocumentList');
  const message = document.getElementById('contractDocumentMessage');
  let previewUrl;
  async function api(path = '', options = {}) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) throw Error('Please sign in to view saved documents.');
    const response = await fetch(base + path, { ...options, cache: 'no-store', headers: { Authorization: 'Bearer ' + token, ...(options.body ? {'Content-Type': 'application/json'} : {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.message || data.error || 'Unable to load documents.');
    return data;
  }
  function text(tag, value) { const element = document.createElement(tag); element.textContent = value; return element; }
  async function refresh() {
    const data = await api(); list.replaceChildren();
    if (!data.documents.length) list.append(text('p', 'No documents saved yet.'));
    for (const doc of data.documents) {
      const row = document.createElement('article'); row.className = 'surface-pad invoice-row';
      row.append(text('h3', doc.title), text('p', doc.client_name + ' · ' + (doc.category === 'insurance' ? 'Insurance' : 'Contract') + ' · Draft · Not sent'));
      for (const action of ['Preview', 'Download PDF']) {
        const button = text('button', action); button.type = 'button'; button.className = 'secondary-button';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const { document: saved } = await api('/' + doc.id);
            const blob = new Blob([Uint8Array.from(atob(saved.pdf_base64), c => c.charCodeAt(0))], {type: 'application/pdf'});
            const url = URL.createObjectURL(blob);
            if (action === 'Preview') {
              if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = url;
              document.getElementById('contractDocumentPreviewTitle').textContent = saved.title;
              document.getElementById('contractDocumentFrame').src = url;
              const preview = document.getElementById('contractDocumentPreview'); preview.hidden = false; preview.scrollIntoView({behavior:'smooth',block:'start'});
            } else {
              const a = document.createElement('a'); a.href = url; a.download = saved.title.replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
            }
          } catch(e) { message.textContent = e.message; } finally { button.disabled = false; }
        }); row.append(button);
      }
      list.append(row);
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const file = form.elements.pdf.files[0];
      if (!file || file.size > 2000000) throw Error('Choose a PDF smaller than 2 MB.');
      const pdfBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(Error('Unable to read PDF.')); reader.readAsDataURL(file); });
      await api('', { method:'POST', body:JSON.stringify({clientName:form.elements.clientName.value,title:form.elements.title.value,category:form.elements.category.value,pdfBase64}) });
      form.elements.pdf.value = ''; message.textContent = 'Draft saved. Nothing has been sent.'; await refresh();
    } catch(e) { message.textContent = e.message; } finally { button.disabled = false; }
  });
  document.addEventListener('contract-documents-updated', () => refresh().catch(e => { message.textContent = e.message; }));
  refresh().catch(e => { list.textContent = e.message; });
})();

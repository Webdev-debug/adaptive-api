
function fetchWithTimeout(url, opts, ms){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, Object.assign({}, opts, { signal: controller.signal }))
    .finally(() => clearTimeout(timer));
}

async function loadDashboard(){
  const key = document.getElementById('key-input').value.trim();
  const status = document.getElementById('key-status');
  const list = document.getElementById('sources-list');
  if(!key){
    status.textContent = 'Enter a key first.';
    return;
  }
  status.textContent = 'Loading...';
  list.innerHTML = '';
  try {
    const res = await fetchWithTimeout('/sources', { headers:{'x-api-key':key} }, 8000);
    if(res.status === 401){
      status.textContent = 'Invalid API key.';
      return;
    }
    const data = await res.json();
    status.textContent = '';
    if(!data.sources || data.sources.length === 0){
      list.innerHTML = '<div class="empty">No sources yet. Send an event to /webhook/:source with this key to see it appear here.</div>';
      return;
    }
    data.sources.forEach(src => {
      const card = document.createElement('div');
      card.className = 'source-card';

      let fieldsHtml = '';
      for(const name in src.fields){
        const f = src.fields[name];
        const conf = src.eventCount ? Math.round((f.seenCount||0)/src.eventCount*100) : 0;
        fieldsHtml += '<div class="field-item"><span>' + name + ' (' + f.type + ') — ' + conf + '% confidence</span><span class="pill ' + (f.required?'req':'') + '">' + (f.required?'required':'optional') + '</span></div>';
      }

      card.innerHTML =
        '<div class="head"><span class="name">' + src.name + '</span><span class="badge">v' + src.version + '</span></div>' +
        '<div class="meta">' + src.eventCount + ' events received</div>' +
        '<div class="field-list">' + fieldsHtml + '</div>' +
        '<div class="forward-line">Forward URL: <span>' + (src.forwardUrl || 'not configured') + '</span></div>' +
        '<div class="breaking-section" id="breaking-' + src.name + '"><h4>Breaking Changes</h4><span class="breaking-none">Loading...</span></div>';

      list.appendChild(card);
      loadBreakingChanges(key, src.name);
    });
  } catch(e){
    status.textContent = 'Failed to load: ' + e.message;
  }
}

async function loadBreakingChanges(key, sourceName){
  try {
    const res = await fetchWithTimeout('/breaking-changes/' + sourceName, { headers:{'x-api-key':key} }, 8000);
    const data = await res.json();
    const box = document.getElementById('breaking-' + sourceName);
    if(!data.changes || data.changes.length === 0){
      box.innerHTML = '<h4>Breaking Changes</h4><span class="breaking-none">None detected — this source has never sent unexpected data.</span>';
      return;
    }
    let html = '<h4>Breaking Changes</h4>';
    data.changes.slice().reverse().forEach(c => {
      const time = new Date(c.timestamp).toLocaleString();
      html += '<div class="breaking-item"><span class="field">' + c.field + '</span> expected ' + c.expectedType + ', got ' + c.actualType + ' — ' + time + '</div>';
    });
    box.innerHTML = html;
  } catch(e){
    const box = document.getElementById('breaking-' + sourceName);
    if(box) box.innerHTML = '<h4>Breaking Changes</h4><span class="breaking-none">Could not load.</span>';
  }
}

async function loadBreakingChanges(key, sourceName){
  try {
    const res = await fetchWithTimeout('/breaking-changes/' + sourceName, { headers:{'x-api-key':key} }, 8000);
    const data = await res.json();
    const box = document.getElementById('breaking-' + sourceName);
    if(!data.changes || data.changes.length === 0){
      box.innerHTML = '<h4>Breaking Changes</h4><span class="breaking-none">None detected — this source has never sent unexpected data.</span>';
      return;
    }
    let html = '<h4>Breaking Changes</h4>';
    data.changes.slice().reverse().forEach(c => {
      const time = new Date(c.timestamp).toLocaleString();
      html += '<div class="breaking-item"><span class="field">' + c.field + '</span> expected ' + c.expectedType + ', got ' + c.actualType + ' — ' + time + '</div>';
    });
    box.innerHTML = html;
  } catch(e){
    const box = document.getElementById('breaking-' + sourceName);
    if(box) box.innerHTML = '<h4>Breaking Changes</h4><span class="breaking-none">Could not load.</span>';
  }
}

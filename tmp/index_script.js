
let currentSource = 'stripe';
let apiKey = null;
const knownVersions = {};
const output = document.getElementById('output');
const fieldsBox = document.getElementById('blueprint-fields');
const versionTag = document.getElementById('version-tag');
const stabilityTag = document.getElementById('stability-tag');
const keybox = document.getElementById('keybox');
const keydisplay = document.getElementById('keydisplay');
const keywarn = document.getElementById('keywarn');
const forwardStatus = document.getElementById('forward-status');
const btnSaveForward = document.getElementById('btn-save-forward');
const timelineList = document.getElementById('timeline-list');
const allButtons = ['btn-send','btn-newfield','btn-history','btn-duplicate','btn-pii'].map(id => document.getElementById(id));

const sampleData = {
  stripe: { eventType:'payment.success', amount:500, currency:'USD' },
  shopify: { orderNumber:'SHOP-1029', total:89.99, customerEmail:'test@example.com' }
};

function setBusy(busy){
  allButtons.forEach(b => b.disabled = busy || !apiKey);
}

function fetchWithTimeout(url, opts, ms){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, Object.assign({}, opts, { signal: controller.signal }))
    .finally(() => clearTimeout(timer));
}

async function signup(){
  try {
    const res = await fetchWithTimeout('/signup', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: 'demo-visitor' })
    }, 8000);
    const data = await res.json();
    apiKey = data.apiKey;
    keydisplay.textContent = apiKey;
    keydisplay.style.display = 'block';
    keywarn.style.display = 'block';
    keybox.classList.add('has-key');
    allButtons.forEach(b => b.disabled = false);
    btnSaveForward.disabled = false;
    loadSchema(currentSource);
    loadTimeline(currentSource);
  } catch(e){
    keydisplay.style.display = 'block';
    keydisplay.textContent = 'Signup failed: ' + e.message;
  }
}

async function saveForwardUrl(){
  if(!apiKey) return;
  const url = document.getElementById('forward-url').value.trim();
  if(!url){
    forwardStatus.textContent = 'Enter a URL first.';
    return;
  }
  forwardStatus.textContent = 'Saving...';
  try {
    const res = await fetchWithTimeout('/configure/' + currentSource, {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey},
      body: JSON.stringify({ url })
    }, 8000);
    const data = await res.json();
    forwardStatus.textContent = 'Saved for "' + currentSource + '". Send an event below to test it.';
  } catch(e){
    forwardStatus.textContent = 'Failed to save: ' + e.message;
  }
}

function setSource(src){
  currentSource = src;
  document.getElementById('tab-stripe').classList.toggle('active', src==='stripe');
  document.getElementById('tab-shopify').classList.toggle('active', src==='shopify');
  forwardStatus.textContent = '';
  if(apiKey){
    loadSchema(src);
    loadTimeline(src);
  }
}

async function loadTimeline(sourceAtCallTime){
  if(!apiKey) return;
  const src = sourceAtCallTime || currentSource;
  try {
    const res = await fetchWithTimeout('/schema/' + src + '/history', { headers:{'x-api-key':apiKey} }, 8000);
    if(src !== currentSource) return;
    const data = await res.json();
    if(!data.history || data.history.length === 0){
      timelineList.innerHTML = '<span class="timeline-empty">No history yet — send an event to start the timeline.</span>';
      return;
    }
    timelineList.innerHTML = '';
    data.history.slice().reverse().forEach(entry => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const fieldsStr = entry.addedFields.map(f => '<span>' + f + '</span>').join(', ');
      item.innerHTML = '<div class="timeline-dot">v' + entry.version + '</div><div class="timeline-body"><div class="when">' + time + '</div><div class="fields">+ ' + fieldsStr + '</div></div>';
      timelineList.appendChild(item);
    });
  } catch(e){
    if(src !== currentSource) return;
    timelineList.innerHTML = '<span class="timeline-empty">Could not load timeline.</span>';
  }
}

async function loadSchema(sourceAtCallTime){
  if(!apiKey) return;
  const src = sourceAtCallTime || currentSource;
  try {
    const res = await fetchWithTimeout('/schema/' + src, { headers:{'x-api-key':apiKey} }, 8000);
    if(src !== currentSource) return;
    if(res.status === 404){
      fieldsBox.innerHTML = '<span style="color:var(--dim)">No events yet — send one to create this schema.</span>';
      versionTag.textContent = 'v0';
      stabilityTag.textContent = '— %';
      return;
    }
    const data = await res.json();
    if(src !== currentSource) return;

    const prev = knownVersions[src];
    if(prev !== undefined && prev !== data.version){
      versionTag.classList.remove('pulse');
      void versionTag.offsetWidth;
      versionTag.classList.add('pulse');
    }
    knownVersions[src] = data.version;

    versionTag.textContent = 'v' + data.version;

    const fieldNames = Object.keys(data.fields);
    let avgConfidence = 0;
    fieldNames.forEach(name => {
      const f = data.fields[name];
      const conf = data.eventCount ? Math.round((f.seenCount || 0) / data.eventCount * 100) : 0;
      avgConfidence += conf;
    });
    avgConfidence = fieldNames.length ? Math.round(avgConfidence / fieldNames.length) : 0;
    stabilityTag.textContent = avgConfidence + '% STABLE';

    fieldsBox.innerHTML = '';
    for(const name in data.fields){
      const f = data.fields[name];
      const conf = data.eventCount ? Math.round((f.seenCount || 0) / data.eventCount * 100) : 0;
      const row = document.createElement('div');
      row.className = 'field-row';
      row.innerHTML =
        '<div class="field-top"><span>' + name + ' <span style="color:var(--dim)">(' + f.type + ')</span></span>' +
        '<span><span class="pill ' + (f.required ? 'req' : '') + '">' + (f.required ? 'required' : 'optional') + '</span></span></div>' +
        '<div class="confidence-track"><div class="confidence-fill" style="width:' + conf + '%"></div></div>' +
        '<span class="confidence-label">' + conf + '% confidence (' + (f.seenCount||0) + '/' + data.eventCount + ' events)</span>';
      fieldsBox.appendChild(row);
    }
  } catch(e){
    if(src !== currentSource) return;
    fieldsBox.innerHTML = '<span style="color:var(--danger)">Schema load failed: ' + e.message + '</span>';
  }
}

async function post(url, data){
  if(!apiKey) return;
  setBusy(true);
  output.classList.remove('err');
  output.textContent = 'Sending...';
  try {
    const res = await fetchWithTimeout(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey},
      body: JSON.stringify(data)
    }, 8000);
    const json = await res.json();
    output.textContent = JSON.stringify(json, null, 2);
    await loadSchema(currentSource);
    await loadTimeline(currentSource);
  } catch(e){
    output.classList.add('err');
    output.textContent = e.name === 'AbortError' ? 'Request timed out after 8s.' : 'Request failed: ' + e.message;
  } finally {
    setBusy(false);
  }
}

async function get(url){
  if(!apiKey) return;
  setBusy(true);
  output.classList.remove('err');
  output.textContent = 'Loading...';
  try {
    const res = await fetchWithTimeout(url, { headers:{'x-api-key':apiKey} }, 8000);
    const json = await res.json();
    output.textContent = JSON.stringify(json, null, 2);
  } catch(e){
    output.classList.add('err');
    output.textContent = e.name === 'AbortError' ? 'Request timed out after 8s.' : 'Request failed: ' + e.message;
  } finally {
    setBusy(false);
  }
}

function sendEvent(){
  post('/webhook/' + currentSource, Object.assign({ userId:'alice' }, sampleData[currentSource]));
}
function sendEventNewField(){
  const extra = Object.assign({ userId:'alice' }, sampleData[currentSource], { note:'auto-added-field' });
  post('/webhook/' + currentSource, extra);
}
function getHistory(){
  get('/history/alice');
}

function sendDuplicate(){
  const fixedPayload = { userId:'alice', orderId:'DUPLICATE-TEST-001', amount:99 };
  post('/webhook/' + currentSource, fixedPayload);
}

function sendPII(){
  const withPII = Object.assign({ userId:'alice' }, sampleData[currentSource], { email:'johndoe@example.com', phone:'+2348012345678' });
  post('/webhook/' + currentSource, withPII);
}

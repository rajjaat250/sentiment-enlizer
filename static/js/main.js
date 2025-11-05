// main.js - handles UI interactions and fetch calls

const analyzeBtn = document.getElementById('analyzeBtn');
const commentBox = document.getElementById('commentBox');
const singleResult = document.getElementById('singleResult');
const fileInput = document.getElementById('fileInput');
const batchResult = document.getElementById('batchResult');
const summaryStats = document.getElementById('summaryStats');
const topList = document.getElementById('topList');
const pieCtx = document.getElementById('pieChart').getContext('2d');
let pieChart;

function setDarkMode(enabled){
  document.documentElement.classList.toggle('dark', enabled);
}

// Dark toggle
document.getElementById('darkToggle').addEventListener('change', (e)=>{
  setDarkMode(e.target.checked);
});

analyzeBtn.addEventListener('click', async ()=>{
  const comment = commentBox.value.trim();
  if(!comment){
    singleResult.innerHTML = '<p class="muted">Type a comment first.</p>';
    return;
  }
  singleResult.innerHTML = '<p class="muted">Analyzing…</p>';
  const res = await fetch('/analyze', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({comment})
  });
  const data = await res.json();
  singleResult.innerHTML = `
    <div class="row between">
      <div><strong>${data.sentiment}</strong> ${data.emoji}</div>
      <div>Polarity: ${data.polarity}</div>
    </div>
    <p class="quote">"${escapeHtml(comment)}"</p>
  `;
});

// Sample loader
document.getElementById('sampleBtn').addEventListener('click', async ()=>{
  try {
    const resp = await fetch('/static/uploads/sample_comments.txt');
    if (!resp.ok) throw new Error('Sample file not found');
    const text = await resp.text();
    commentBox.value = "";
    // show first line as sample
    commentBox.value = text.split('\n').filter(Boolean)[0] || '';
  } catch (error) {
    console.error('Error loading sample:', error);
    commentBox.value = "Error loading sample.";
  }
});

// File upload
fileInput.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const form = new FormData();
  form.append('file', file);
  batchResult.innerHTML = '<p class="muted">Uploading and analyzing…</p>';
  
  try {
    const resp = await fetch('/upload', {method:'POST', body: form});
    const data = await resp.json();
    if(data.error){ batchResult.innerHTML = `<p class="error" style="color: red;">${data.error}</p>`; return; }

    // Show summary and list
    batchResult.innerHTML = `<p class="muted">Analyzed ${data.total} comments.</p>`;
    updateChart(data);
    renderTopList(data.items.slice(0, 10));
  } catch (error) {
    console.error('Upload error:', error);
    batchResult.innerHTML = `<p class="error" style="color: red;">An error occurred during upload.</p>`;
  }
});

function updateChart(summary){
  const labels = ['Positive','Negative','Neutral'];
  const values = [summary.positive, summary.negative, summary.neutral];
  
  // *** THIS IS THE FIX ***
  // Provide colors for the chart segments
  const chartColors = [
    'rgb(34, 197, 94)',  // Positive (Green)
    'rgb(239, 68, 68)', // Negative (Red)
    'rgb(156, 163, 175)' // Neutral (Gray)
  ];

  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets:[{
        label: 'Comment Sentiment',
        data: values,
        backgroundColor: chartColors, // <-- ADDED THIS
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins:{
        legend:{
          position:'bottom'
        }
      }
    }
  });

  summaryStats.innerHTML = `
    <p>Positive: ${summary.positive} (${summary.positive_pct}%)</p>
    <p>Negative: ${summary.negative} (${summary.negative_pct}%)</p>
    <p>Neutral: ${summary.neutral} (${summary.neutral_pct}%)</p>
  `;
}

function renderTopList(items){
  if (items.length === 0) {
    topList.innerHTML = '<p class="muted">No comments to display.</p>';
    return;
  }
  topList.innerHTML = items.map(it=>`
    <div class="item">
      <div class="item-left">
        <div class="emoji">${it.emoji}</div>
        <div class="text">${escapeHtml(it.text)}</div>
      </div>
      <div class="pol">${it.label} (${it.polarity})</div>
    </div>
  `).join('\n');
}

function escapeHtml(s){
  if (!s) return '';
  return s.replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// Initialize chart with zeros on page load
updateChart({
  positive: 0, negative: 0, neutral: 0,
  positive_pct: 0, negative_pct: 0, neutral_pct: 0
});

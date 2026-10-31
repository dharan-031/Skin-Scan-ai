const fileInput = document.querySelector('#fileInput');
const browseButton = document.querySelector('#browseButton');
const dropzone = document.querySelector('#dropzone');
const cameraButton = document.querySelector('#cameraButton');
const captureButton = document.querySelector('#captureButton');
const cancelCameraButton = document.querySelector('#cancelCameraButton');
const video = document.querySelector('#video');
const cameraWrap = document.querySelector('#cameraWrap');
const previewWrap = document.querySelector('#previewWrap');
const preview = document.querySelector('#preview');
const analyzeButton = document.querySelector('#analyzeButton');
const errorBox = document.querySelector('#error');
const result = document.querySelector('#result');

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 12 * 1024 * 1024;
let selectedFile = null;
let stream = null;
let previewUrl = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = '';
  errorBox.hidden = true;
}

function revokePreviewUrl() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  cameraWrap.hidden = true;
}

function chooseFile(file) {
  clearError();
  if (!file) return;
  if (!ACCEPTED_TYPES.has(file.type)) {
    showError('Please choose a JPG, PNG, or WebP photo.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showError('This photo is larger than 12 MB. Please choose a smaller image.');
    return;
  }

  stopCamera();
  revokePreviewUrl();
  selectedFile = file;
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  previewWrap.hidden = false;
  dropzone.hidden = true;
  analyzeButton.disabled = false;
  result.hidden = true;
}

function resetPhoto() {
  selectedFile = null;
  revokePreviewUrl();
  preview.removeAttribute('src');
  previewWrap.hidden = true;
  dropzone.hidden = false;
  fileInput.value = '';
  analyzeButton.disabled = true;
  result.hidden = true;
  clearError();
}

fileInput.addEventListener('change', (event) => chooseFile(event.target.files[0]));
browseButton.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  chooseFile(event.dataTransfer.files[0]);
});
document.querySelector('#removeButton').addEventListener('click', resetPhoto);

cameraButton.addEventListener('click', async () => {
  clearError();
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not available on this page. You can choose a photo instead.');
    }
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    video.srcObject = stream;
    cameraWrap.hidden = false;
    dropzone.hidden = true;
    await video.play();
  } catch (error) {
    stopCamera();
    dropzone.hidden = false;
    const message = error.name === 'NotAllowedError'
      ? 'Camera access was denied. Allow it in your browser settings, or choose a photo instead.'
      : error.message || 'The camera could not be opened. Please choose a photo instead.';
    showError(message);
  }
});

cancelCameraButton.addEventListener('click', () => {
  stopCamera();
  dropzone.hidden = false;
});

captureButton.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  if (!canvas.width || !canvas.height) {
    showError('The camera is still starting. Please try again in a moment.');
    return;
  }
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    if (blob) chooseFile(new File([blob], 'skin-photo.jpg', { type: 'image/jpeg' }));
    else showError('Could not capture the photo. Please try again.');
  }, 'image/jpeg', 0.92);
});

analyzeButton.addEventListener('click', async () => {
  if (!selectedFile) return;
  clearError();
  analyzeButton.disabled = true;
  analyzeButton.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Taking a closer look…';
  result.hidden = true;

  const body = new FormData();
  body.append('image', selectedFile);
  body.append('context', document.querySelector('#context').value);
  try {
    const response = await fetch('/api/analyze', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Could not review the photo. Please try again.');
    render(data);
  } catch (error) {
    showError(error.message || 'Unable to contact the local app. Check that it is running and try again.');
  } finally {
    analyzeButton.disabled = !selectedFile;
    analyzeButton.innerHTML = 'Take a closer look <span aria-hidden="true">→</span>';
  }
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function renderList(items) {
  if (!items?.length) return '<p>None noted.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderSection(title, items, className = '') {
  return `<section class="result-section ${className}"><h4>${escapeHtml(title)}</h4>${renderList(items)}</section>`;
}

function render(data) {
  const commonName = data.condition_common_name || data.most_likely;
  const medicalName = data.condition_medical_name || 'Not established from this photo';
  const sections = [
    renderSection('What I can see', data.visible_features),
    renderSection('Other possibilities', data.alternatives),
    renderSection('Things you can do', data.home_care),
    renderSection('Things to avoid', data.avoid),
    renderSection('When to talk to a doctor', data.see_doctor_when),
    renderSection('About this photo', [data.image_clarity]),
    renderSection('Get urgent medical help if…', data.red_flags, 'redflags'),
  ].join('');
  const crossCheck = data.dataset_cross_check?.length
    ? `<div class="dataset-check"><h3>Research model suggestions</h3>${renderList(data.dataset_cross_check)}<p>These are experimental suggestions, not a diagnosis or proof of infection.</p></div>`
    : '';

  result.innerHTML = `
    <div class="result-head"><h2>Here’s what I noticed</h2><span class="badge">${data.status === 'unclear' ? 'Photo needs another look' : 'A possible explanation'} · ${escapeHtml(data.confidence)} confidence</span></div>
    <div class="diagnosis"><span class="condition-label">WHAT IT MIGHT BE</span><h3>${escapeHtml(commonName)}</h3><p class="medical-name"><b>Medical term:</b> ${escapeHtml(medicalName)}</p><p>${escapeHtml(data.confidence_reason)}</p></div>
    ${crossCheck}
    <div class="result-grid">${sections}</div>
    <p class="disclaimer">${escapeHtml(data.disclaimer)}</p>`;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.addEventListener('pagehide', () => {
  stopCamera();
  revokePreviewUrl();
});

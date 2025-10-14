// ====== FIRMAS MASIVAS - CONTROLADOR ÚNICO ======
document.addEventListener('DOMContentLoaded', () => {
  // ================== Estado general ==================
  const totalSteps = 3;
  let currentStep = 1;

  // Firma y documentos
  let uploadedFiles = [];             // File[]

  // ================== Coordenadas por formato ==================
  const COORDS = {
    'GCLPFO-002': { pageIndex: 0, x: 120, y: 140, width: 160 }, // A38
    'GCLPFO-004': { pageIndex: 0, x: 120, y: 520, width: 160 }
  };

  // ================== Referencias DOM ==================
  const uploadArea = document.querySelector('.upload-area');
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect');
  const fileList = document.getElementById('fileList');
  const documentSummary = document.getElementById('documentSummary');
  const progressLine = document.getElementById('progressLine');

  const steps = Array.from(document.querySelectorAll('.step'));
  const stepContents = Array.from(document.querySelectorAll('.step-content'));

  // ================== Utilidades ==================
  function isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  function readableSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0, b = bytes;
    while (b > 1024 && i < units.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(1)} ${units[i]}`;
  }

  // ================== ================== ================== ==================
  // CARGA DE DOCUMENTOS
  // ================== ================== ================== ==================
  function addFiles(fileListLike) {
    const incoming = Array.from(fileListLike || []);

    const unique = incoming.filter(f =>
      !uploadedFiles.some(u =>
        u.name === f.name && u.size === f.size && u.lastModified === f.lastModified
      )
    );

    const valid = unique.filter(f => {
      if (!isPdf(f)) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo no válido',
          text: `El archivo "${f.name}" no es un PDF válido.`,
          confirmButtonColor: '#d33'
        });
        return false;
      }
      if (!isValidFileForFormat(f, formatSelect.value)) {
        Swal.fire({
          icon: 'warning',
          title: 'Formato incorrecto',
          text: `El archivo "${f.name}" no corresponde al formato seleccionado (${formatSelect.value}).`,
          confirmButtonColor: '#f0ad4e'
        });
        return false;
      }
      return true;
    });

    uploadedFiles.push(...valid);

    renderFileList();
    renderSummary();

    if (fileInput) fileInput.value = '';

    const skipped = incoming.length - valid.length;
    if (skipped > 0) {
      console.warn(`Se omitieron ${skipped} archivo(s) por no cumplir validaciones.`);
    }
  }

  fileInput?.addEventListener('change', (e) => {
    addFiles(e.target.files);
  });

  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      addFiles(e.dataTransfer.files);
    });
  }

  function renderFileList() {
    if (!fileList) return;
    fileList.innerHTML = '';
    uploadedFiles.forEach((f, idx) => {
      const fileItem = document.createElement('div');
      fileItem.classList.add('file-item');
      const fileSize = readableSize(f.size);
      fileItem.style.cssText =
        'display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border-color);border-radius:8px;padding:.75rem;margin:.35rem 0;background:#fff;';
      fileItem.innerHTML = `
        <div class="file-info" style="display:flex;gap:.75rem;align-items:center;">
          <div class="file-icon">📄</div>
          <div>
            <div class="file-name" style="font-weight:600">${f.name}</div>
            <div class="file-size" style="font-size:.875rem;color:var(--text-light)">
              ${(f.type || 'desconocido')} • ${fileSize}
            </div>
          </div>
        </div>
        <button class="remove-file" style="border:none;background:transparent;color:#c00;cursor:pointer" onclick="removeFile(${idx})">✕</button>
      `;
      fileList.appendChild(fileItem);
    });
  }

  function renderSummary() {
    if (!documentSummary) return;

    if (uploadedFiles.length === 0) {
      documentSummary.innerHTML = `
      <div style="padding: 0.5rem; color: #666; font-style: italic;">
        No hay documentos cargados.
      </div>
    `;
      return;
    }

    const pdfFiles = uploadedFiles.filter(f => isPdf(f));
    const totalPdf = pdfFiles.length;

    documentSummary.innerHTML = `
    <div style="padding: 0.5rem;">
      <h4 style="margin-bottom: 0.5rem; color: var(--text-dark);">Resumen de documentos cargados</h4>
      <ul style="margin:0; padding-left:1.25rem; line-height:1.6;">
        <li><strong>Total de documentos:</strong> ${uploadedFiles.length}</li>
        <li><strong>Archivos PDF válidos:</strong> ${totalPdf}</li>
      </ul>
    </div>
  `;
  }

  window.removeFile = function (idx) {
    uploadedFiles.splice(idx, 1);
    renderFileList();
    renderSummary();
  };

  formatSelect?.addEventListener('change', () => {
    selectedFormat = formatSelect.value || null;
  });

  function isValidFileForFormat(file, selectedFormat) {
    if (!selectedFormat) return false;
    const fileName = file.name.toUpperCase();
    return fileName.includes(selectedFormat);
  }

  // ================== Navegación ==================
  function updateProgressLine() {
    if (!progressLine) return;
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressLine.style.width = progressPercentage + '%';
  }

  function goToStep(n) {
    currentStep = n;

    stepContents.forEach((content, index) => {
      content.classList.toggle('active', index + 1 === currentStep);
    });

    steps.forEach((step, index) => {
      step.classList.toggle('completed', index + 1 < currentStep);
      step.classList.toggle('active', index + 1 === currentStep);
    });

    updateProgressLine();
  }

  window.nextStep = function () {
    if (currentStep === 1) {
      if (uploadedFiles.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: 'Por favor, cargue al menos un documento antes de continuar.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      if (!formatSelect || !formatSelect.value) {
        Swal.fire({
          icon: 'info',
          title: 'Formato requerido',
          text: 'Por favor, seleccione un formato antes de continuar.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      const representanteLegalSelect = document.getElementById('representanteLegalSelect');
      if (!representanteLegalSelect || !representanteLegalSelect.value) {
        Swal.fire({
          icon: 'info',
          title: 'Campo obligatorio',
          text: 'Por favor, seleccione un representante legal antes de continuar.',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
    }

    if (currentStep === totalSteps) {
      const formData = new FormData();
      formData.append('formato', formatSelect.value);

      const representanteLegalSelect = document.getElementById('representanteLegalSelect');
      formData.append('representanteLegal', representanteLegalSelect.value);

      const commentsInput = document.getElementById('comments');
      formData.append('comments', commentsInput ? commentsInput.value : '');

      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      fetch('/api/masiveSign/', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            Swal.fire({
              icon: 'error',
              title: 'Error al subir archivos',
              text: data.message || 'Hubo un problema con la carga.',
              confirmButtonColor: '#d33'
            });
          } else {
            console.log('Archivos subidos exitosamente');
            Swal.fire({
              icon: 'success',
              title: 'Éxito',
              text: 'Los archivos se subieron correctamente.',
              confirmButtonColor: '#28a745'
            }).then(() => {
              goToStep(3);
            });
          }
        })
        .catch(error => {
          console.error('Error:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error inesperado',
            text: 'No se pudo subir los archivos.',
            confirmButtonColor: '#d33'
          });
        });

      return false;
    }

    if (currentStep < totalSteps) {
      document.querySelector(`[data-step="${currentStep}"]`)?.classList.add('completed');
      document.querySelector(`[data-step="${currentStep}"]`)?.classList.remove('active');
      document.getElementById(`step${currentStep}`)?.classList.remove('active');

      currentStep++;
      document.getElementById(`step${currentStep}`)?.classList.add('active');
      document.querySelector(`[data-step="${currentStep}"]`)?.classList.add('active');

      updateProgressLine();

      if (currentStep === 3) {
        renderSummary();
        updateSignaturePreviewStep3();
      }
    }
  };

  window.previousStep = function () {
    if (currentStep > 1) {
      const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);
      const currentContentEl = document.getElementById(`step${currentStep}`);

      currentStepEl?.classList.remove('active', 'completed');
      currentContentEl?.classList.remove('active');

      const previousStep = currentStep - 1;
      const previousStepEl = document.querySelector(`[data-step="${previousStep}"]`);
      const previousContentEl = document.getElementById(`step${previousStep}`);

      previousStepEl?.classList.add('active');
      previousContentEl?.classList.add('active');
      currentStep = previousStep;

      updateProgressLine();
    }
  };

  window.resetProcess = function () {
    window.location.href = "/api/index";
  };

  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      nextStep();
    });
  }

  updateProgressLine();
  renderSummary();
});
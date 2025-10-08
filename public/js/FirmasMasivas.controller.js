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

  //Aqui se convierte el tamaño a un formato legible
  function readableSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0, b = bytes;
    while (b > 1024 && i < units.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(1)} ${units[i]}`;
  }



  // ================== ================== ================== ==================
  //CODIGO PARA LA CARGA DE DOCUMENTOS
  // ================== ================== ================== ==================

  // Acumula sin duplicar (mismo nombre + tamaño + lastModified)
function addFiles(fileListLike) {
  const incoming = Array.from(fileListLike || []);

  // Filtrar duplicados
  const unique = incoming.filter(f =>
    !uploadedFiles.some(u =>
      u.name === f.name && u.size === f.size && u.lastModified === f.lastModified
    )
  );

  // Validar que los archivos correspondan al formato elegido
  const valid = unique.filter(f => {
    if (!isPdf(f)) {
      alert(`❌ El archivo "${f.name}" no es un PDF válido.`);
      return false;
    }
    if (!isValidFileForFormat(f, formatSelect.value)) {
      alert(`⚠️ El archivo "${f.name}" no corresponde al formato seleccionado (${formatSelect.value}).`);
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


  //Aqui se agregan los eventos para el input de archivos
  fileInput?.addEventListener('change', (e) => {
    addFiles(e.target.files);
  });

  //Aqui se agregan los eventos para el area de carga
  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    //Aqui se quita la clase dragover la cual pone el borde azul al area de carga
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    //Aqui se quita la clase dragover y se agregan los archivos al area de carga
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      addFiles(e.dataTransfer.files);
    });
  }

  // Render lista por índice (no por nombre)
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

  //Aqui se actualiza la vista previa de la firma en el paso 3 con el resumen de documentos
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

    // Contar solo PDFs (por seguridad)
    const pdfFiles = uploadedFiles.filter(f => isPdf(f));
    const totalPdf = pdfFiles.length;

    // Renderizar lista estructurada
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


  // Exponer para botón eliminar
  window.removeFile = function (idx) {
    uploadedFiles.splice(idx, 1);
    renderFileList();
    renderSummary();
  };

  // ================== Selección de formato ==================
  formatSelect?.addEventListener('change', () => {
    selectedFormat = formatSelect.value || null;
  });

  function isValidFileForFormat(file, selectedFormat) {
  if (!selectedFormat) return false; // Si no hay formato elegido aún
  const fileName = file.name.toUpperCase(); // Normalizar a mayúsculas
  return fileName.includes(selectedFormat); // Solo válido si contiene el código
}



  // ================== ================== ================== ==================
  //CODIGO PARA NAVEGACION DE PASOS
  // ================== ================== ================== ==================
  function updateProgressLine() {
    if (!progressLine) return;
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressLine.style.width = progressPercentage + '%';
  }

  function goToStep(n) {
    // Actualizar paso actual
    currentStep = n;

    // Actualizar contenido de los pasos
    stepContents.forEach((content, index) => {
      if (index + 1 === currentStep) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Actualizar indicadores de pasos
    steps.forEach((step, index) => {
      if (index + 1 < currentStep) {
        // Pasos anteriores
        step.classList.remove('active');
        step.classList.add('completed');
      } else if (index + 1 === currentStep) {
        // Paso actual
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        // Pasos futuros
        step.classList.remove('active', 'completed');
      }
    });

    // Actualizar línea de progreso
    updateProgressLine();
  };

  window.nextStep = function () {
    // Validaciones
    if (currentStep === 1) {
      if (uploadedFiles.length === 0) {
        alert('Por favor, cargue al menos un documento antes de continuar.');
        return;
      }
      if (!formatSelect || !formatSelect.value) {
        alert('Por favor, seleccione un formato antes de continuar.');
        return;
      }
      const representanteLegalSelect = document.getElementById('representanteLegalSelect');
      if (!representanteLegalSelect || !representanteLegalSelect.value) {
        alert('Por favor, seleccione un representante legal antes de continuar.');
        return;
      }
    }
    if (currentStep === totalSteps) {
      // Si estamos en el último paso, crear y enviar el FormData
      const formData = new FormData();

      // Agregar el formato seleccionado
      formData.append('formato', formatSelect.value);

      // Agregar el representante legal seleccionado
      const representanteLegalSelect = document.getElementById('representanteLegalSelect');
      formData.append('representanteLegal', representanteLegalSelect.value);

      // Agregar cada archivo
      uploadedFiles.forEach((file, index) => {
        formData.append('files', file);
      });

      // Enviar el formulario
      fetch('/api/masiveSign/', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            alert('Error al subir los archivos: ' + data.message);
          } else {
            console.log('Archivos subidos exitosamente');
            goToStep(3); // Avanzar al paso de éxito
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Error al subir los archivos');
        });

      return false; // Prevenir el envío normal del formulario
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
      // Obtener elementos del paso actual
      const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);
      const currentContentEl = document.getElementById(`step${currentStep}`);

      // Remover clases del paso actual
      if (currentStepEl) {
        currentStepEl.classList.remove('active', 'completed');
        currentContentEl?.classList.remove('active');
      }



      const previousStep = currentStep - 1;

      // Activar el paso anterior
      const previousStepEl = document.querySelector(`[data-step="${previousStep}"]`);
      const previousContentEl = document.getElementById(`step${previousStep}`);

      //aq
      if (previousStepEl && previousContentEl) {
        previousStepEl.classList.add('active');
        previousContentEl.classList.add('active');
        currentStep = previousStep;
      }


      // Actualizar la línea de progreso
      updateProgressLine();
    }
  };

  window.resetProcess = function () {
    window.location.href = "/api/index";
  };




  // Prevenir el envío normal del formulario
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      nextStep();
    });
  }

  // Inicialización visual
  updateProgressLine();
  renderSummary();
});


// ====== FIRMAS MASIVAS - CONTROLADOR ÚNICO ======
document.addEventListener('DOMContentLoaded', () => {
  // ================== Estado general ==================
  const totalSteps = 3;
  let currentStep = 1;

  // Firma y documentos
  let uploadedFiles = [];             // File[]
  let signedOutputs = [];             // {name: string, bytes: Uint8Array}[]
  let signatureBlobUrl = null;        // blob URL si suben imagen de firma
  let drewOnCanvas = false;           // si dibujaron en canvas
  let selectedFormat = null;          // 'GCLPFO-002' | 'GCLPFO-004'

  // ================== Coordenadas por formato ==================
  const COORDS = {
    'GCLPFO-002': { pageIndex: 0, x: 120, y: 140, width: 160 }, // A38
    'GCLPFO-004': { pageIndex: 0, x: 120, y: 520, width: 160 }
  };

  // ================== Referencias DOM ==================
  const uploadArea  = document.querySelector('.upload-area');
  const fileInput   = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect');
  const fileList    = document.getElementById('fileList');
  const documentSummary = document.getElementById('documentSummary');
  const progressLine = document.getElementById('progressLine');

  const steps = Array.from(document.querySelectorAll('.step'));
  const stepContents = Array.from(document.querySelectorAll('.step-content'));

  // Firma (paso 2 / preview paso 3)
  const signatureCanvas = document.getElementById('signatureCanvas');
  const signatureInput  = document.getElementById('signatureInput');
  const signaturePreview = document.getElementById('signaturePreview');
  const signaturePreviewStep3 = document.getElementById('signaturePreviewStep3');
  const signaturePlaceholder  = document.getElementById('signaturePlaceholder');

  // Si no hay canvas no seguimos (evita errores en páginas sin esa sección)
  const canvasCtx = signatureCanvas?.getContext('2d');

  // ================== Utilidades ==================
  function toArrayBuffer(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsArrayBuffer(blob);
    });
  }

  function dataURLFromCanvas(canvas) {
    return canvas.toDataURL('image/png');
  }

  function isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }
  function isImage(file) {
    return /^image\/(png|jpe?g)$/i.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  }
  function isOffice(file) {
    return /(msword|officedocument)|(xlsx)$/i.test(file.type) || /\.(docx?|xlsx)$/i.test(file.name);
  }

  function readableSize(bytes) {
    const units = ['B','KB','MB','GB'];
    let i=0, b=bytes;
    while (b > 1024 && i < units.length-1) { b/=1024; i++; }
    return `${b.toFixed(1)} ${units[i]}`;
  }

  // ================== Carga de documentos ==================
  // Acumula sin duplicar (mismo nombre + tamaño + lastModified)
  function addFiles(fileListLike) {
    const incoming = Array.from(fileListLike || []);
    const toAdd = incoming.filter(f =>
      !uploadedFiles.some(u =>
        u.name === f.name && u.size === f.size && u.lastModified === f.lastModified
      )
    );

    uploadedFiles.push(...toAdd);

    renderFileList();
    renderSummary();

    // Permite volver a seleccionar el mismo archivo
    if (fileInput) fileInput.value = '';

    const skipped = incoming.length - toAdd.length;
    if (skipped > 0) {
      console.warn(`Se omitieron ${skipped} archivo(s) duplicado(s).`);
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

  function renderSummary() {
    if (!documentSummary) return;
    if (uploadedFiles.length === 0) {
      documentSummary.innerHTML = '<em>No hay documentos cargados.</em>';
      return;
    }
    const counts = { pdf:0, img:0, office:0, otros:0 };
    uploadedFiles.forEach(f=>{
      if (isPdf(f)) counts.pdf++;
      else if (isImage(f)) counts.img++;
      else if (isOffice(f)) counts.office++;
      else counts.otros++;
    });
    documentSummary.innerHTML = `
      <ul style="margin:0;padding-left:1.25rem">
        <li>PDF: ${counts.pdf}</li>
        <li>Imágenes (PNG/JPG): ${counts.img}</li>
        <li>Office (DOC/DOCX/XLSX): ${counts.office} <span style="color:#b86">* se requiere convertir a PDF</span></li>
        <li>Otros: ${counts.otros}</li>
        <li>Total: ${uploadedFiles.length}</li>
      </ul>
    `;
  }

  // Exponer para botón eliminar
  window.removeFile = function(idx) {
    uploadedFiles.splice(idx, 1);
    renderFileList();
    renderSummary();
  };

  // ================== Selección de formato ==================
  formatSelect?.addEventListener('change', () => {
    selectedFormat = formatSelect.value || null;
  });

  // ================== Firma: Canvas y carga de imagen ==================
  function resizeSignatureCanvas() {
    if (!signatureCanvas || !canvasCtx) return;
    const rect = signatureCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    signatureCanvas.width  = Math.max(600, rect.width) * ratio;
    signatureCanvas.height = 200 * ratio;
    canvasCtx.setTransform(1,0,0,1,0,0);
    canvasCtx.scale(ratio, ratio);
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    canvasCtx.strokeStyle = '#000000';
    canvasCtx.lineWidth = 2;
  }
  resizeSignatureCanvas();
  window.addEventListener('resize', resizeSignatureCanvas);

  // Dibujo simple




  // Limpiar firma
  window.clearCanvas = function(){
    if (!signatureCanvas || !canvasCtx) return;
    const ratio = window.devicePixelRatio || 1;
    canvasCtx.setTransform(1,0,0,1,0,0);
    signatureCanvas.width = signatureCanvas.width; // reset
    canvasCtx.scale(ratio, ratio);
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    canvasCtx.strokeStyle = '#000';
    canvasCtx.lineWidth = 2;
    drewOnCanvas = false;

    // ocultar preview de imagen subida si existía
    if (signaturePreview) {
      signaturePreview.style.display = 'none';
      signaturePreview.src = '';
    }
    if (signatureBlobUrl) URL.revokeObjectURL(signatureBlobUrl);
    signatureBlobUrl = null;
    updateSignaturePreviewStep3();
  };

  // Adjuntar imagen de firma
  signatureInput?.addEventListener('change', async () => {
    const file = signatureInput.files && signatureInput.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      alert('La firma debe ser una imagen (PNG/JPG).');
      return;
    }
    if (signatureBlobUrl) URL.revokeObjectURL(signatureBlobUrl);
    signatureBlobUrl = URL.createObjectURL(file);
    if (signaturePreview) {
      signaturePreview.src = signatureBlobUrl;
      signaturePreview.style.display = 'block';
    }
    drewOnCanvas = false; // preferimos la imagen cargada
    updateSignaturePreviewStep3();
  });

  // Vista previa de firma (Paso 3)
  function isCanvasBlank(cv) {
    const ctx = cv.getContext('2d');
    const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false; // alpha > 0
    }
    return true;
  }

  function updateSignaturePreviewStep3() {
    if (!signaturePreviewStep3 || !signaturePlaceholder) return;
    let src = null;
    if (signatureBlobUrl) src = signatureBlobUrl;
    else if (drewOnCanvas && !isCanvasBlank(signatureCanvas)) src = dataURLFromCanvas(signatureCanvas);

    if (src) {
      signaturePreviewStep3.src = src;
      signaturePreviewStep3.style.display = 'inline-block';
      signaturePlaceholder.style.display = 'none';
    } else {
      signaturePreviewStep3.src = '';
      signaturePreviewStep3.style.display = 'none';
      signaturePlaceholder.style.display = 'inline';
    }
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

  window.nextStep = function() {
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

  window.previousStep = function() {
    if (currentStep > 1) {
        // Obtener elementos del paso actual
        const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);
        const currentContentEl = document.getElementById(`step${currentStep}`);
        
        // Remover clases del paso actual
        if (currentStepEl) {
            currentStepEl.classList.remove('active', 'completed');
            currentContentEl?.classList.remove('active');
        }
        
        // Decrementar el paso
        currentStep--;
        
        // Activar el paso anterior
        const previousStepEl = document.querySelector(`[data-step="${currentStep}"]`);
        const previousContentEl = document.getElementById(`step${currentStep}`);
        
        if (previousStepEl && previousContentEl) {
            previousStepEl.classList.add('active');
            previousContentEl.classList.add('active');
        }
        
        // Actualizar la línea de progreso
        updateProgressLine();
    }
};

  window.resetProcess = function() {
    window.location.href = "/api/index";
  };

  // Paso 3: botón "Firmar Documentos" (prepara estado/preview)
  window.signDocuments = function() {
    updateSignaturePreviewStep3();
    // Solo feedback; la firma real ocurre al descargar (paso 4)
    setTimeout(() => nextStep(), 400);
  };



// ================== ================== ================== ==================
  //CODIGO PARA LA FIRMA DE DOCUMENTOS
// ================== ================== ================== ==================


  // ================== Firma de documentos (PDF-lib) ==================
 
  // ================== Descarga (Paso 4) ==================
  window.firmarDocumentoExcel = async function(){
    try {
      const { skipped } = await buildAndSignAll();

      if (!signedOutputs.length) {
        const msg = skipped.length
          ? `No se firmó ningún documento.\nOmitidos:\n- ${skipped.join('\n- ')}`
          : 'No se generaron salidas.';
        alert(msg);
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder('documentos-firmados');
      signedOutputs.forEach(doc => folder.file(doc.name, doc.bytes));
      if (skipped.length) {
        folder.file('README.txt',
`Archivos omitidos:
${skipped.map(s => '- ' + s).join('\n')}

Motivo: formatos Office (DOC/DOCX/XLSX) requieren conversión previa a PDF en el navegador.
`);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos-firmados.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(`No se pudo completar la firma: ${err.message}`);
    }
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


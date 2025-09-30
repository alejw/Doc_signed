// ====== SCRIPT INDEX.JS COMPLETO ======
document.addEventListener('DOMContentLoaded', () => {
  // ================== Estado general ==================
  let currentStep = 1;
  const totalSteps = 4;
  let uploadedFiles = [];

  // ================== Referencias DOM generales ==================
  const fileInput   = document.getElementById('fileInput');
  const uploadArea  = document.querySelector('.upload-area');
  const fileList    = document.getElementById('fileList');

  // ================== Carga de documentos ==================
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
      handleFiles(e.dataTransfer.files);
    });
  }

  fileInput?.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      uploadedFiles.push(file);
      displayFile(file);
    });
  }

  function displayFile(file) {
    const fileItem = document.createElement('div');
    fileItem.classList.add('file-item');

    const fileSize = (file.size / 1024).toFixed(2) + ' KB';

    fileItem.innerHTML = `
      <div class="file-info">
        <div class="file-icon">📄</div>
        <div>
          <div class="file-name">${file.name}</div>
          <div class="file-size">${fileSize}</div>
        </div>
      </div>
      <button class="remove-file" onclick="removeFile(this, '${file.name.replace(/'/g, "\\'")}')">✕</button>
    `;

    fileList.appendChild(fileItem);
  }

  // expone para botón eliminar
  window.removeFile = function(button, fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
    button.parentElement.remove();
  };

  // ================== Navegación de pasos ==================
  window.nextStep = function() {
    if (currentStep === 1 && uploadedFiles.length === 0) {
      alert('Por favor, cargue al menos un documento antes de continuar.');
      return;
    }
    if (currentStep === 2) {
      const signatureCanvas = document.getElementById('signatureCanvas');
      if (isCanvasBlank(signatureCanvas)) {
        alert('Por favor, proporcione una firma antes de continuar.');
        return;
      }
      
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
        updateDocumentSummary();
        updateSignaturePreview(); // ← actualiza la vista previa de firma al entrar al paso 3
      }
    }
  };

  window.previousStep = function() {
    if (currentStep > 1) {
      document.querySelector(`[data-step="${currentStep}"]`)?.classList.remove('active');
      document.getElementById(`step${currentStep}`)?.classList.remove('active');

      currentStep--;

      document.getElementById(`step${currentStep}`)?.classList.add('active');
      const stepEl = document.querySelector(`[data-step="${currentStep}"]`);
      stepEl?.classList.add('active');
      stepEl?.classList.remove('completed');

      updateProgressLine();
    }
  };

  function updateProgressLine() {
    const progressLine = document.getElementById('progressLine');
    if (!progressLine) return;
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressLine.style.width = progressPercentage + '%';
  }

  function updateDocumentSummary() {
    const summaryContainer = document.getElementById('documentSummary');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = '';

    uploadedFiles.forEach(file => {
      const fileSize = (file.size / 1024).toFixed(2) + ' KB';
      const summaryItem = document.createElement('div');
      summaryItem.style.cssText =
        'display: flex; justify-content: space-between; padding: 0.75rem; background: white; border-radius: 8px; margin-bottom: 0.5rem;';
      summaryItem.innerHTML = `
        <span style="color: var(--text-dark); font-weight: 500;">${file.name}</span>
        <span style="color: var(--text-light); font-size: 0.875rem;">${fileSize}</span>
      `;
      summaryContainer.appendChild(summaryItem);
    });
  }

  window.signDocuments = function() {
    setTimeout(() => {
      nextStep();
    }, 1000);
  };

  window.resetProcess = function() {
    currentStep = 1;
    uploadedFiles = [];

    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('active', 'completed');
    });
    document.querySelector('[data-step="1"]')?.classList.add('active');

    document.querySelectorAll('.step-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById('step1')?.classList.add('active');

    fileList.innerHTML = '';
    clearCanvas();
    updateSignaturePreview();
    updateProgressLine();
  };

  // ================== Firma: Canvas + Vista previa Paso 3 ==================
  const signatureCanvas   = document.getElementById('signatureCanvas');
  const signatureInput    = document.getElementById('signatureInput'); // <input type="file" accept="image/*">
  const previewImgStep3   = document.getElementById('signaturePreviewStep3'); // <img> en paso 3
  const placeholderStep3  = document.getElementById('signaturePlaceholder');  // span [Firma digital]

  // Si no existe canvas (por estructura de la página), salir sin romper
  if (!signatureCanvas) return;

  const ctx = signatureCanvas.getContext('2d');


  signatureCanvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    lastX = e.offsetX; lastY = e.offsetY;

    // Si ya estás en el paso 3, actualiza en vivo
    if (document.getElementById('step3')?.classList.contains('active')) {
      updateSignaturePreview();
    }
  });

  signatureCanvas.addEventListener('mouseup', () => (drawing = false));
  signatureCanvas.addEventListener('mouseout', () => (drawing = false));

  // Botones expuestos en ventana
  //window.startDrawing = function() { drawing = true; };

  window.clearCanvas = function() {
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  };

  // Adjuntar imagen de firma al canvas
  function drawImageOnCanvas(dataUrl) {
    const img = new Image();
    img.onload = function() {
      ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      // Encajar manteniendo proporción
      const ratio = Math.min(signatureCanvas.width / img.width, signatureCanvas.height / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (signatureCanvas.width - w) / 2;
      const y = (signatureCanvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      updateSignaturePreview();
    };
    img.src = dataUrl;
  }

  window.attachSignature = function() {
    const file = signatureInput?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => drawImageOnCanvas(e.target.result);
    reader.readAsDataURL(file);
  };

  // Dispara attachSignature cuando se elige archivo
  signatureInput?.addEventListener('change', () => window.attachSignature());



  // Vista previa Paso 3
  function isCanvasBlank(cv) {
    const { data } = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false; // algún pixel con alpha > 0
    }
    return true;
  }


  //aqui la funcion realiza una actualizacion de la vista previa de la firma
  function updateSignaturePreview() {
    if (!previewImgStep3 || !placeholderStep3) return;

    if (isCanvasBlank(signatureCanvas)) {
      previewImgStep3.style.display = 'none';
      previewImgStep3.removeAttribute('src');
      placeholderStep3.style.display = 'inline';
    } else {
      previewImgStep3.src = signatureCanvas.toDataURL('image/png');
      previewImgStep3.style.display = 'inline';
      placeholderStep3.style.display = 'none';
    }
  }

  // Inicializa estado de la vista previa
  updateSignaturePreview();
  
});






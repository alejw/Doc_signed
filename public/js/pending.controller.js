let currentFilter = 'pending';
let selectedDocumentId = null;

function toggleFilter(filter) {
    const pendingOption = document.getElementById('pendingOption');
    const signedOption = document.getElementById('signedOption');
    
    currentFilter = filter;
    const status = filter === 'pending' ? 'PENDIENTE' : 'FIRMADO';

    // Actualizar clases activas
    if (filter === 'pending') {
        pendingOption.classList.add('active');
        pendingOption.classList.remove('inactive');
        signedOption.classList.add('inactive');
        signedOption.classList.remove('active');
    } else {
        signedOption.classList.add('active');
        signedOption.classList.remove('inactive');
        pendingOption.classList.add('inactive');
        pendingOption.classList.remove('active');
    }

    window.location.href = `/api/pending?status=${status}`;
}

// Agregar la función sumarUnDia al inicio del archivo
function sumarUnDia(fecha) {
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('es-ES');
}

//desde aqui manejamos el modal y las interacciones de la vista de pendientes
document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.document-card');
    const modal = document.getElementById("myModal");
    const closeBtn = document.getElementById("closeModalBtn");

    cards.forEach(card => {
        // Animaciones hover
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });

        // Click para mostrar modal
        card.addEventListener('click', async function() {
            try {
                const idSolicitud = this.getAttribute("data-id");
                // Obtener el estado del botón activo Y actualizar selectedDocumentId
                const activeButton = document.querySelector('.toggle-option.active');
                const estado = activeButton.getAttribute('data-status');
                selectedDocumentId = idSolicitud; // Aquí está el cambio importante

                console.log('Estado del switch:', estado);
                console.log('ID Solicitud seleccionada:', selectedDocumentId);
                
                if (!idSolicitud) {
                    console.error('ID de solicitud no encontrado');
                    return;
                }

                showModal(estado);
                const detallesInfo = modal.querySelector('.detalles-info');
                detallesInfo.innerHTML = '<p class="loading">Cargando detalles...</p>';

                const response = await fetch(`/api/pending/detalles/${idSolicitud}?estado=${estado}`);
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const data = await response.json();
                console.log('Datos recibidos:', data);

                if (data.detalles && data.detalles.length > 0) {
                    const detallesHtml = data.detalles.map(det => {
                        // Asegurarse de que estamos usando la URL correcta
                        const documentUrl = estado === 'FIRMADO' ? 
                            det.url_archivo : // Ya viene como url_archivo_firmado del backend
                            det.url_archivo;  // URL original

                        console.log('URL a mostrar:', documentUrl);

                        return `
                            <div class="detalle-section">
                                <div class="detalle-header">
                                    <h3>Documento ${det.nombre_original}</h3>
                                    <span class="fecha">${sumarUnDia(det.fecha_solicitud)}</span>
                                </div>   
                                <div class="detalle-content">
                                    <p><strong>ID solicitud:</strong> ${det.id_solicitud}</p>
                                    <p><strong>ID detalle:</strong> ${det.estado_documento === 'FIRMADO' ? det.id_detalle_firmado : det.id_registro_detalles}</p>
                                    <p><strong>Estado:</strong> ${det.estado_documento}</p>
                                    <div class="document-actions">
                                        <button class="btn-preview" onclick="previewPDF('${documentUrl}')">
                                            Ver documento
                                        </button>
                                        <a href="${documentUrl}" target="_blank" class="btn-download">
                                            Descargar PDF
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    detallesInfo.innerHTML = detallesHtml;

                    // Mostrar el primer documento
                    if (data.detalles[0]?.url_archivo) {
                        previewPDF(data.detalles[0].url_archivo);
                    }
                } else {
                    detallesInfo.innerHTML = '<p class="no-detalles">No hay detalles disponibles</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                detallesInfo.innerHTML = `<p class="error-message">Error al cargar los detalles: ${error.message}</p>`;
            }
        });
    });


    // Función para previsualizar PDF
    
    window.previewPDF = function (url) {
        if (!url) {
            console.error('URL no válida');
            return;
        }
        console.log('Mostrando documento:', url);
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer) {
            pdfViewer.src = url;
        }
    };

    // Mostrar y ocultar modal
    function showModal(status) {
        document.body.classList.add('modal-open');
        modal.style.display = "flex";
        
        // Mostrar u ocultar el botón según el estado
        const signAllBtn = document.getElementById('signAllBtn');
        if (signAllBtn) {
            signAllBtn.style.display = status === 'FIRMADO' ? 'none' : 'block';
        }
    }
    

    function hideModal() {
        document.body.classList.remove('modal-open');
        modal.style.display = "none";
    }

    // Cerrar modal
    closeBtn.onclick = hideModal;


    window.onclick = (e) => {
        if (e.target === modal) hideModal();
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });


    function initializeModal() {
        const modal = document.getElementById("myModal");
        document.body.classList.remove('modal-open');
        modal.style.display = "none";
        // Limpiar el iframe si existe
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer) pdfViewer.src = '';
    }

    initializeModal();

});

// fuera de document.addEventListener(...)
function signAllDocuments() {
    console.log('Intentando firmar documentos. ID seleccionado:', selectedDocumentId);
    
    if (!selectedDocumentId) {
        alert('Por favor, seleccione una solicitud para firmar');
        return;
    }

    const data = {
        "selectedFormat": "A4",
        "COORDS": {
            "A4": {
                "pageIndex": 0,
                "x": 100,
                "y": 100,
                "width": 160
            }
        }
    };

    console.log('Enviando solicitud de firma para ID:', selectedDocumentId);

    fetch(`/api/pending/${selectedDocumentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Documentos firmados exitosamente');
            window.location.reload();
        } else {
            alert('Error al firmar los documentos: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al procesar la firma de documentos');
    });
}
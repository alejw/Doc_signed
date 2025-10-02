let currentFilter = 'pending';

function toggleFilter(filter) {
    currentFilter = filter; // Actualiza el filtro actual
    const status = filter === 'pending' ? 'PENDIENTE' : 'FIRMADO'; //aqui se mapea el filtro al estado
    window.location.href = `http://localhost:3000/api/pending?status=${status}`;
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
        card.addEventListener('click', function () {
            const idSolicitud = this.getAttribute("data-id");
            if (currentFilter === 'pending' && idSolicitud) {
                showModal();
                const detallesInfo = modal.querySelector('.detalles-info');
                detallesInfo.innerHTML = '<p class="loading">Cargando detalles...</p>';
                // Función auxiliar para sumar 1 día a la fecha
                const sumarUnDia = (fechaStr) => {
                    const fecha = new Date(fechaStr);
                    fecha.setDate(fecha.getDate() + 1);
                    return fecha.toLocaleDateString('es-ES');
                };
                fetch(`/api/pending/detalles/${idSolicitud}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.detalles && data.detalles.length > 0) {
                            const detallesHtml = data.detalles.map(det => `
                                <div class="detalle-section">
                                    <div class="detalle-header">
                                        <h3>Documento ${det.tipo_documento}</h3>
                                        <span class="fecha">${det.fecha_solicitud ? sumarUnDia(det.fecha_solicitud) : 'Sin fecha'}</span>
                                    </div>  
                                    <div class="detalle-content">
                                        <p><strong>ID Detalle:</strong> ${det.id_registro_detalles}</p>
                                        <p><strong>Fecha Solicitud:</strong> ${det.fecha_solicitud ? new Date(det.fecha_solicitud).toLocaleDateString('es-ES') : 'No disponible'}</p>
                                        <p><strong>Tipo Documento:</strong> ${det.tipo_documento}</p>
                                        <div class="document-actions">
                                            <button class="btn-preview" onclick="previewPDF('${det.url_archivos}')">
                                                Ver documento
                                            </button>
                                            <a href="${det.url_archivos}" target="_blank" class="btn-download">
                                                Descargar PDF
                                            </a>
                                            
                                        </div>
                                    </div>
                                  
                                </div>
                            `).join('');


                            detallesInfo.innerHTML = detallesHtml;

                            // Mostrar primer documento en el visor
                            if (data.detalles[0]?.url_archivos) {
                                document.getElementById('pdfViewer').src = data.detalles[0].url_archivos;
                            }
                        } else {
                            detallesInfo.innerHTML = '<p class="no-detalles">No hay detalles disponibles</p>';
                        }
                    })
                    .catch(err => {
                        console.error('Error:', err);
                        detallesInfo.innerHTML = '<p class="error-message">Error al cargar los detalles</p>';
                    });
            }
        });
    });


    // Función para previsualizar PDF
    window.previewPDF = function (url) {
        const pdfViewer = document.getElementById('pdfViewer');
        if (pdfViewer) {
            // Agregar parámetros para deshabilitar herramientas de edición
            const viewerUrl = url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';
            pdfViewer.src = viewerUrl;
            console.log('Cargando PDF:', viewerUrl);
        } else {
            console.error('No se encontró el elemento pdfViewer');
        }
    };

    // Mostrar y ocultar modal
    function showModal() {
        document.body.classList.add('modal-open');
        modal.style.display = "flex";
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
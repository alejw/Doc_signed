 let isDrawing = false;
        let canvas, ctx;

        document.addEventListener('DOMContentLoaded', function() {
            updateSignaturePreview();
            initCanvas();
        });

        function updateSignaturePreview() {
            const editor = document.getElementById('signatureEditor');
            const preview = document.getElementById('signaturePreview');
            preview.textContent = editor.value || 'No hay contenido en la firma...';
        }

        function switchTab(tabName) {
            // Ocultar todas las pestañas
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Mostrar la pestaña seleccionada
            event.target.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        }

        function initCanvas() {
            canvas = document.getElementById('signatureCanvas');
            ctx = canvas.getContext('2d');
            
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
            
            // Touch events para móviles
            canvas.addEventListener('touchstart', function(e) {
                e.preventDefault();
                startDrawing(e.touches[0]);
            });
            canvas.addEventListener('touchmove', function(e) {
                e.preventDefault();
                draw(e.touches[0]);
            });
            canvas.addEventListener('touchend', function(e) {
                e.preventDefault();
                stopDrawing();
            });
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }

        function startDrawing(e) {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            ctx.beginPath();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        }

        function draw(e) {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
        }

        function stopDrawing() {
            isDrawing = false;
        }

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        function changePenColor() {
            const color = document.getElementById('penColor').value;
            ctx.strokeStyle = color;
        }

        function saveDrawnSignature() {
            const imageData = canvas.toDataURL();
            alert('Firma manuscrita guardada exitosamente!');
            console.log('Firma manuscrita guardada:', imageData);
        }

        function saveSignatureConfig() {
            const activeTab = document.querySelector('.tab.active').textContent;
            let configData = { type: activeTab };
            
            if (activeTab.includes('Texto')) {
                configData.signature = document.getElementById('signatureEditor').value;
            } else if (activeTab.includes('Manuscrita')) {
                configData.signature = canvas.toDataURL();
            }
            
            alert('Configuración de firma guardada exitosamente!');
            console.log('Configuración guardada:', configData);
        }

        function testSignature() {
            alert('Función de prueba de firma ejecutada. Se generaría un documento de prueba con tu firma actual.');
        }

        function exportSignature() {
            const activeTab = document.querySelector('.tab.active').textContent;
            if (activeTab.includes('Manuscrita')) {
                const link = document.createElement('a');
                link.download = 'mi_firma.png';
                link.href = canvas.toDataURL();
                link.click();
            } else {
                alert('Función de exportación disponible solo para firmas manuscritas.');
            }
        }

        //este codigo es para enviar mensaje advirtiendo que no ha adjuntado ningun archivo
        document.querySelector('form[name="files"]').addEventListener('submit', function(event) {
            const files = document.getElementById('signatureUpload').files;
            if (files.length === 0) {
                event.preventDefault();
                alert('Por favor, adjunta un archivo antes de enviar.');
            }
        });

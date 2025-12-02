let statusCheckInterval = null;
let currentScanMode = 'complete';
let currentCustomType = null;

// FONCTION RÉUTILISABLE POUR GÉNÉRER LE FORMULAIRE
function createPortScanForm(prefix, defaultValues = {}) {
    return `
        <div class="form-group">
            <label for="${prefix}-target-ip">Adresse IP Cible</label>
            <input type="text" id="${prefix}-target-ip" value="${defaultValues.ip || '127.0.0.1'}" placeholder="Ex: 192.168.1.1">
        </div>
        <div class="form-group">
            <label>Plage de Ports</label>
            <div class="port-range">
                <input type="number" id="${prefix}-port-start" value="${defaultValues.startPort || '1'}" placeholder="Port début">
                <input type="number" id="${prefix}-port-end" value="${defaultValues.endPort || '1000'}" placeholder="Port fin">
            </div>
        </div>
        <div class="form-group">
            <label for="${prefix}-scan-type">Type de Scan</label>
            <select id="${prefix}-scan-type">
                <option value="tcp">TCP Scan</option>
                <option value="udp">UDP Scan</option>
            </select>
        </div>
    `;
}
// FONCTION POUR RÉCUPÉRER LES VALEURS DU FORMULAIRE

function getScanConfigFromForm(prefix) {
    return {
        target: document.getElementById(`${prefix}-target-ip`).value,
        port_start: document.getElementById(`${prefix}-port-start`).value,
        port_end: document.getElementById(`${prefix}-port-end`).value,
        scan_type: document.getElementById(`${prefix}-scan-type`).value
    };
}

// INITIALISATION DES FORMULAIRES AU CHARGEMENT
document.addEventListener('DOMContentLoaded', () => {
    // Formulaire scan complet (ports 1-4000)
    document.getElementById('completeConfig').innerHTML = createPortScanForm('complete', {
        ip: '127.0.0.1',
        startPort: '1',
        endPort: '4000'
    });

    // Formulaire scan personnalisé (ports 1-1000)
    document.getElementById('portScanForm').innerHTML = createPortScanForm('custom', {
        ip: '127.0.0.1',
        startPort: '1',
        endPort: '1000'
    });
});

// GESTION DES MODALS
function openModal() {
    document.getElementById('scanModal').classList.add('active');
}

function closeModal() {
    document.getElementById('scanModal').classList.remove('active');
}

function openFirewallModal() {
    document.getElementById('firewallModal').classList.add('active');
}

function closeFirewallModal() {
    document.getElementById('firewallModal').classList.remove('active');
}

function openWarningModal() {
    document.getElementById('warningModal').classList.add('active');
}

function closeWarningModal() {
    document.getElementById('warningModal').classList.remove('active');
}

// SÉLECTION DU MODE DE SCAN
function selectScanMode(mode) {
    currentScanMode = mode;
    const buttons = document.querySelectorAll('.scan-type-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const completeConfig = document.getElementById('completeConfig');
    const customConfig = document.getElementById('customConfig');
    
    if (mode === 'complete') {
        completeConfig.style.display = 'block';
        customConfig.style.display = 'none';
    } else {
        completeConfig.style.display = 'none';
        customConfig.style.display = 'block';
    }
}

// SÉLECTION DU TYPE PERSONNALISÉ
function selectCustomType(type) {
    currentCustomType = type;
    const options = document.querySelectorAll('.custom-option-btn');
    options.forEach(opt => opt.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    const portForm = document.getElementById('portScanForm');
    const packageForm = document.getElementById('packageScanForm');

    if (type === 'port') {
        portForm.style.display = 'block';
        packageForm.style.display = 'none';
    } else {
        portForm.style.display = 'none';
        packageForm.style.display = 'block';
    }
}
// DÉMARRAGE DU SCAN
async function startScanFromModal() {
    if (currentScanMode === 'complete') {
        closeModal();
        openWarningModal();
    } else {
        if (!currentCustomType) {
            alert('Veuillez sélectionner le type de scan (Ports ou Packages)');
            return;
        }
        closeModal();
        executeScan();
    }
}

function confirmCompleteScan() {
    closeWarningModal();
    executeScan();
}

// EXÉCUTION DU SCAN (UTILISE LA FONCTION RÉUTILISABLE)
async function executeScan() {
    let scanConfig = {
        mode: currentScanMode
    };

    if (currentScanMode === 'complete') {
        // Utilisation de la fonction réutilisable
        const formData = getScanConfigFromForm('complete');
         for (let key in formData) {
            scanConfig[key] = formData[key];
        }

        scanConfig.include_packages = true;

        
        console.log('Démarrage du scan complet:', scanConfig);
    } else {
        if (currentCustomType === 'port') {
            // Utilisation de la fonction réutilisable
            const formData = getScanConfigFromForm('custom');
            scanConfig = { ...scanConfig, ...formData };
            scanConfig.include_packages = false;
            
            console.log('Démarrage du scan personnalisé des ports:', scanConfig);
        } else {
            scanConfig.scan_packages_only = true;
            console.log('Démarrage du scan des packages système');
        }
    }

    try {
        const response = await fetch('/api/scanPort', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scanConfig)
        });

        const data = await response.json();
        console.log('Réponse API scan:', data);
        
        if (response.ok) {
            startScan();
            checkScanStatus();
        } else {
            console.error('Erreur scan:', data.error);
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
    }
}

// GESTION DU SCAN
function startScan() {
    const statusIndicator = document.getElementById('status-indicator');
    statusIndicator.className = 'status-indicator status-scanning';
    
    const portResults = document.getElementById('port-results');
    portResults.innerHTML = '<p style="color: #00d4ff;"> Scan en cours... Veuillez patienter.</p>';
    
    document.getElementById('startScanBtn').style.display = 'none';
    document.getElementById('stopScanBtn').style.display = 'block';
    
    document.getElementById('stat-open').textContent = '0';
    document.getElementById('stat-services').textContent = '0';
}

function checkScanStatus() {
    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/scan-status');
            const status = await response.json();
            console.log('Status du scan:', status);
            
            if (!status.running && status.progress === 100) {
                clearInterval(statusCheckInterval);
                stopScan();
                displayScanResults(status.results);
            } else if (status.error) {
                clearInterval(statusCheckInterval);
                stopScan();
                console.error('Erreur pendant le scan:', status.error);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du statut:', error);
        }
    }, 1000);
}

function displayScanResults(results) {
    const portResults = document.getElementById('port-results');
    portResults.innerHTML = '';

    console.log('Résultats du scan:', results);

    if (!results || results.error) {
        portResults.innerHTML = `<p style="color: #f87171;"> ${results?.error || 'Aucun résultat'}</p>`;
        return;
    }

    let totalPorts = 0;
    let openPorts = 0;

    if (results.hosts && results.hosts.length > 0) {
        results.hosts.forEach(host => {
            host.protocols.forEach(proto => {
                proto.ports.forEach(port => {
                    totalPorts++;
                    if (port.state === 'open') {
                        openPorts++;

                        const resultHTML = `
                            <div class="result-item port-open">
                                <strong>Port ${port.port} - OUVERT</strong><br>
                                Protocole: ${proto.protocol.toUpperCase()}<br>
                                Service: ${port.name || 'Inconnu'}<br>
                                ${port.product ? `Produit: ${port.product}<br>` : ''}
                                ${port.version ? `Version: ${port.version}<br>` : ''}
                                État: Accessible
                            </div>
                        `;
                        portResults.innerHTML += resultHTML;
                    }
                });
            });
        });
    }

    document.getElementById('stat-open').textContent = openPorts;
    document.getElementById('stat-services').textContent = openPorts;

    console.log(`Scan terminé - Total: ${totalPorts}, Ouverts: ${openPorts}`);

    if (openPorts === 0) {
        portResults.innerHTML = '<p style="color: #a0a0a0; text-align: center;">Aucun port ouvert détecté.</p>';
    }
}

async function stopScan() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    try {
        await fetch('/api/stop-scan', {
            method: 'POST'
        });
        console.log('Scan arrêté');
    } catch (error) {
        console.error('Erreur lors de l\'arrêt du scan:', error);
    }
    
    const statusIndicator = document.getElementById('status-indicator');
    statusIndicator.className = 'status-indicator status-idle';
    
    document.getElementById('startScanBtn').style.display = 'block';
    document.getElementById('stopScanBtn').style.display = 'none';
}

// GESTION FIREWALL
async function applyFirewallRule() {
   
}
// EXPORT PDF
function exportPDF() {
}

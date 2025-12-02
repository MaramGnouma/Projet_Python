import nmap
import json
import threading
import os

# Variable globale pour stocker l'état du scan
scan_status = {
    "running": False,
    "progress": 0,
    "results": []
}

def PortScan(target, ports, scan_type='tcp'):
    # Définir les arguments selon le type de scan
    scan_arguments = {
        'tcp': '-sT -sV',           
        'syn': '-sS -sV',           
        'udp': '-sU',               
    }
    
    args = scan_arguments.get(scan_type)
    
    try:
        scanner = nmap.PortScanner()
        print(f"Scanning {target} on ports {ports} with type {scan_type} (arguments: {args})...")
        scanner.scan(target, ports, arguments=args)
    except Exception as e:
        raise Exception(f"Erreur nmap: {str(e)}. Assurez-vous que nmap est installé.")

    output = {
        "target": target,
        "ports_range": ports,
        "scan_type": scan_type,
        "hosts": []
    }

    for host in scanner.all_hosts():
        host_info = {
            "host": host,
            "hostname": scanner[host].hostname(),
            "state": scanner[host].state(),
            "protocols": []
        }

        for proto in scanner[host].all_protocols():
            proto_info = {
                "protocol": proto,
                "ports": []
            }

            for port in sorted(scanner[host][proto].keys()):
                port_data = scanner[host][proto][port]

                proto_info["ports"].append({
                    "port": port,
                    "state": port_data.get("state"),
                    "name": port_data.get("name"),
                    "product": port_data.get("product"),
                    "version": port_data.get("version"),
                })

            host_info["protocols"].append(proto_info)

        output["hosts"].append(host_info)

    return json.dumps(output, indent=4)


def start_scan_service(target, port_start, port_end, scan_type, mode):
    global scan_status
    
    if scan_status["running"]:
        return {"error": "Un scan est déjà en cours", "status": "error"}, 400
    
    # Configuration du scan - utilise TOUJOURS les valeurs fournies
    ports = f"{port_start}-{port_end}"
    
    # Réinitialiser l'état
    scan_status = {
        "running": True,
        "progress": 0,
        "results": [],
        "target": target,
        "ports": ports,
        "scan_type": scan_type,
        "mode": mode
    }
    
    # Lancer le scan dans un thread séparé
    def run_scan():
        global scan_status
        try:
            # Passer le type de scan à PortScan
            result_json = PortScan(target, ports, scan_type)
            result_dict = json.loads(result_json)
            scan_status["results"] = result_dict
            scan_status["progress"] = 100
            scan_status["running"] = False
        except Exception as e:
            scan_status["error"] = str(e)
            scan_status["running"] = False
    
    thread = threading.Thread(target=run_scan)
    thread.daemon = True
    thread.start()
    
    return {
        "status": "started",
        "target": target,
        "ports": ports,
        "scan_type": scan_type,
        "mode": mode
    }, 200


def get_scan_status_service():
    """Récupère l'état actuel du scan"""
    global scan_status
    return scan_status


def stop_scan_service():
    """Arrête le scan en cours"""
    global scan_status
    scan_status["running"] = False
    return {"status": "stopped"}
